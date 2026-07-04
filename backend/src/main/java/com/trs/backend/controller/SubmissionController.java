package com.trs.backend.controller;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.trs.backend.dto.CreateSubmissionRequest;
import com.trs.backend.dto.GraderPayload;
import com.trs.backend.dto.SubmissionFileRequest;
import com.trs.backend.entity.Assignment;
import com.trs.backend.entity.Student;
import com.trs.backend.entity.Submission;
import com.trs.backend.repository.AssignmentRepository;
import com.trs.backend.repository.StudentOnAssignmentRepository;
import com.trs.backend.repository.SubmissionRepository;
import com.trs.backend.service.AuthService;
import com.trs.backend.service.CurrentUser;
import com.trs.backend.service.DtoMapper;
import com.trs.backend.service.SubmissionService;

@RestController
@RequestMapping("/api/submissions")
public class SubmissionController {
    private final AssignmentRepository assignmentRepository;
    private final StudentOnAssignmentRepository studentOnAssignmentRepository;
    private final SubmissionRepository submissionRepository;
    private final AuthService authService;
    private final DtoMapper mapper;
    private final SubmissionService submissionService;
    private final Path uploadDir;

    public SubmissionController(
            AssignmentRepository assignmentRepository,
            StudentOnAssignmentRepository studentOnAssignmentRepository,
            SubmissionRepository submissionRepository,
            AuthService authService,
            DtoMapper mapper,
            SubmissionService submissionService,
            @Value("${trs.upload-dir}") String uploadDir) {
        this.assignmentRepository = assignmentRepository;
        this.studentOnAssignmentRepository = studentOnAssignmentRepository;
        this.submissionRepository = submissionRepository;
        this.authService = authService;
        this.mapper = mapper;
        this.submissionService = submissionService;
        this.uploadDir = Path.of(uploadDir).toAbsolutePath().normalize();
    }

    @PostMapping
    @Transactional
    public ResponseEntity<?> createSubmission(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody(required = false) CreateSubmissionRequest request) {
        CurrentUser currentUser = authService.fromAuthorizationHeader(authorization).orElse(null);
        if (currentUser == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Missing or invalid authorization token"));
        }
        if (!authService.hasRole(currentUser, "STUDENT") || currentUser.student() == null) {
            return ResponseEntity.status(403).body(Map.of("error", "Permission denied"));
        }
        if (request == null || request.assignmentId() == null || request.assignmentId().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "assignment_id is required"));
        }

        UUID assignmentId;
        try {
            assignmentId = UUID.fromString(request.assignmentId());
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(404).body(Map.of("error", "Assignment not found"));
        }

        Assignment assignment = assignmentRepository.findById(assignmentId).orElse(null);
        if (assignment == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Assignment not found"));
        }

        Student student = currentUser.student();
        boolean registered = studentOnAssignmentRepository
                .findByStudentIdAndAssignmentIdAndActiveTrue(student.getId(), assignment.getId())
                .isPresent();
        if (!registered) {
            return ResponseEntity.status(403).body(Map.of("error", "You are not registered for this assignment"));
        }

        if (assignment.getEndDate() != null && OffsetDateTime.now(ZoneOffset.UTC).isAfter(assignment.getEndDate())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Submission deadline has passed"));
        }

        List<Map<String, Object>> savedFiles;
        try {
            savedFiles = saveFiles(student, request.safeFiles());
        } catch (IOException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", "Failed to save submitted files: " + ex.getMessage()));
        }

        if (savedFiles.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No solution files submitted or no valid C++ source files found in zip"));
        }

        Submission submission = new Submission();
        submission.setStudent(student);
        submission.setAssignment(assignment);
        submission.setFiles(savedFiles);
        submission.setStatus("GRADING");
        submissionRepository.saveAndFlush(submission);

        GraderPayload payload = new GraderPayload(
                submission.getId().toString(),
                assignment.getId().toString(),
                student.getMssv(),
                SubmissionService.readPayloadFiles(savedFiles)
        );
        submissionService.gradeAsync(submission.getId(), payload);

        return ResponseEntity.status(201).body(Map.of(
                "submission", mapper.submission(submission),
                "message", "Submission received and is being graded in the background."
        ));
    }

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<?> getSubmissions(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam(value = "assignment_id", required = false) String assignmentIdValue) {
        CurrentUser currentUser = authService.fromAuthorizationHeader(authorization).orElse(null);
        if (currentUser == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Missing or invalid authorization token"));
        }
        if (assignmentIdValue == null || assignmentIdValue.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "assignment_id is required"));
        }

        UUID assignmentId;
        try {
            assignmentId = UUID.fromString(assignmentIdValue);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", "assignment_id is required"));
        }

        List<Submission> submissions;
        if ("TEACHER".equals(currentUser.account().getRole())) {
            submissions = submissionRepository.findByAssignmentIdOrderByCreatedAtDesc(assignmentId);
        } else {
            Student student = currentUser.student();
            submissions = student == null
                    ? List.of()
                    : submissionRepository.findByAssignmentIdAndStudentIdOrderByCreatedAtDesc(assignmentId, student.getId());
        }

        return ResponseEntity.ok(submissions.stream().map(mapper::submission).toList());
    }

    private List<Map<String, Object>> saveFiles(Student student, List<SubmissionFileRequest> files) throws IOException {
        Files.createDirectories(uploadDir);
        List<Map<String, Object>> saved = new ArrayList<>();
        String prefix = student.getMssv() + "_" + System.currentTimeMillis() + "_";

        for (SubmissionFileRequest file : files) {
            if (file == null || file.filename() == null || file.filename().isBlank()) {
                continue;
            }
            String originalFilename = file.filename();
            String cleanFilename = cleanFilename(prefix + originalFilename);
            byte[] bytes = file.content() == null ? new byte[0] : contentBytes(file);

            Path target = uploadDir.resolve(cleanFilename).normalize();
            if (!target.startsWith(uploadDir)) {
                continue;
            }
            Files.write(target, bytes);

            if (originalFilename.toLowerCase().endsWith(".zip")) {
                extractZip(target, cleanFilename, saved);
            } else {
                saved.add(savedFile(originalFilename, target));
            }
        }

        return saved;
    }

    private byte[] contentBytes(SubmissionFileRequest file) throws IOException {
        if ("base64".equalsIgnoreCase(file.encoding())) {
            try {
                return Base64.getDecoder().decode(file.content());
            } catch (IllegalArgumentException ex) {
                throw new IOException("Invalid base64 file content", ex);
            }
        }
        return file.content().getBytes(StandardCharsets.UTF_8);
    }

    private void extractZip(Path zipPath, String zipFilename, List<Map<String, Object>> saved) throws IOException {
        Path extractDir = uploadDir.resolve("extract_" + zipFilename).normalize();
        Files.createDirectories(extractDir);
        try (ZipInputStream zipInput = new ZipInputStream(new ByteArrayInputStream(Files.readAllBytes(zipPath)))) {
            ZipEntry entry;
            while ((entry = zipInput.getNextEntry()) != null) {
                if (entry.isDirectory() || entry.getName().startsWith("/") || entry.getName().contains("..")) {
                    continue;
                }
                String lowerName = entry.getName().toLowerCase();
                if (!(lowerName.endsWith(".cpp") || lowerName.endsWith(".hpp") || lowerName.endsWith(".h") || lowerName.endsWith(".c"))) {
                    continue;
                }
                Path extracted = extractDir.resolve(entry.getName()).normalize();
                if (!extracted.startsWith(extractDir)) {
                    continue;
                }
                Files.createDirectories(extracted.getParent());
                Files.copy(zipInput, extracted, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
                saved.add(savedFile(entry.getName(), extracted));
            }
        }
    }

    private static Map<String, Object> savedFile(String filename, Path path) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("filename", filename);
        map.put("path", path.toString());
        return map;
    }

    private static String cleanFilename(String filename) {
        String normalized = filename.replace("\\", "/");
        int slash = normalized.lastIndexOf('/');
        String base = slash >= 0 ? normalized.substring(slash + 1) : normalized;
        return base.replaceAll("[^A-Za-z0-9._-]", "_");
    }
}
