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
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
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
import com.trs.backend.dto.GraderPayloadFile;
import com.trs.backend.dto.GraderPayloadTestcase;
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
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@RestController
@RequestMapping("/api/submissions")
public class SubmissionController {
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
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

        boolean quizQuestionSet = isQuizQuestionSet(assignment);
        boolean autoGrade = !quizQuestionSet && shouldAutoGrade(assignment);
        List<Map<String, Object>> savedFiles;
        try {
            savedFiles = saveFiles(student, request.safeFiles(), autoGrade);
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
        submission.setStatus(autoGrade ? "GRADING" : "SUCCESS");
        if (quizQuestionSet) {
            submission.setScores(gradeQuizQuestionSet(assignment, savedFiles));
            submission.setFailedOutputs(new LinkedHashMap<>());
        }
        submissionRepository.saveAndFlush(submission);

        if (autoGrade) {
            GraderPayload payload = new GraderPayload(
                    submission.getId().toString(),
                    assignment.getId().toString(),
                    student.getMssv(),
                    SubmissionService.readPayloadFiles(savedFiles),
                    SubmissionService.readCustomTestcases(assignment.getTestcaseSamples())
            );
            runAfterCommit(() -> submissionService.gradeAsync(submission.getId(), payload));
        }

        return ResponseEntity.status(201).body(Map.of(
                "submission", mapper.submission(submission),
                "message", autoGrade
                        ? "Submission received and is being graded in the background."
                        : "Submission received."
        ));
    }

    @PostMapping("/trial")
    @Transactional(readOnly = true)
    public ResponseEntity<?> runTrial(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody(required = false) Map<String, Object> request) {
        CurrentUser currentUser = authService.fromAuthorizationHeader(authorization).orElse(null);
        if (currentUser == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Missing or invalid authorization token"));
        }
        if (!authService.hasRole(currentUser, "STUDENT") || currentUser.student() == null) {
            return ResponseEntity.status(403).body(Map.of("error", "Permission denied"));
        }
        if (request == null || String.valueOf(request.getOrDefault("assignment_id", "")).isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "assignment_id is required"));
        }

        UUID assignmentId;
        try {
            assignmentId = UUID.fromString(String.valueOf(request.get("assignment_id")));
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

        int questionNumber = asInt(request.get("question"), 0);
        String answer = String.valueOf(request.getOrDefault("answer", ""));
        if (questionNumber <= 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "question is required"));
        }
        if (answer.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Answer is empty"));
        }

        List<GraderPayloadTestcase> testcases = readTrialTestcases(request.get("testcases"), questionNumber);
        if (testcases.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No testcase found for this question"));
        }

        try {
            String answersJson = OBJECT_MAPPER.writeValueAsString(Map.of(
                    "assignment_id", assignment.getId().toString(),
                    "answers", List.of(Map.of(
                            "question", questionNumber,
                            "answer", answer
                    ))
            ));
            GraderPayload payload = new GraderPayload(
                    "trial-" + UUID.randomUUID(),
                    assignment.getId().toString(),
                    student.getMssv(),
                    List.of(new GraderPayloadFile("answers.json", "", answersJson)),
                    testcases
            );
            return ResponseEntity.ok(submissionService.gradeTrial(payload));
        } catch (Exception ex) {
            return ResponseEntity.status(502).body(Map.of("error", "Could not run trial: " + ex.getMessage()));
        }
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

    private static boolean shouldAutoGrade(Assignment assignment) {
        String type = assignment.getAssignmentType();
        boolean hasTestcases = assignment.getTestcaseSamples() != null && !assignment.getTestcaseSamples().isBlank();
        if ("QUIZ_CODE".equals(type)) {
            return hasTestcases;
        }
        if ("PROJECT".equals(type)) {
            return hasTestcases;
        }
        return true;
    }

    private static void runAfterCommit(Runnable action) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    action.run();
                }
            });
            return;
        }
        action.run();
    }

    private static boolean isQuizQuestionSet(Assignment assignment) {
        if (!"QUIZ_CODE".equals(assignment.getAssignmentType())) {
            return false;
        }
        String config = assignment.getTypeConfig();
        if (config == null || config.isBlank()) {
            return false;
        }
        try {
            JsonNode root = OBJECT_MAPPER.readTree(config);
            return root.path("questions").isArray();
        } catch (Exception ex) {
            return false;
        }
    }

    private static List<Boolean> gradeQuizQuestionSet(Assignment assignment, List<Map<String, Object>> savedFiles) {
        try {
            JsonNode questions = OBJECT_MAPPER.readTree(assignment.getTypeConfig()).path("questions");
            JsonNode answers = readAnswers(savedFiles).path("answers");
            Map<Integer, String> answerByQuestion = new LinkedHashMap<>();
            if (answers.isArray()) {
                for (JsonNode answer : answers) {
                    int question = answer.path("question").asInt(0);
                    if (question > 0) {
                        answerByQuestion.put(question, answer.path("answer").asText("").trim());
                    }
                }
            }

            List<Boolean> scores = new ArrayList<>();
            for (int index = 0; index < questions.size(); index++) {
                int correctOption = questions.get(index).path("correctOption").asInt(-1);
                String expected = correctOption >= 0 ? String.valueOf((char) ('A' + correctOption)) : "";
                scores.add(expected.equalsIgnoreCase(answerByQuestion.getOrDefault(index + 1, "")));
            }
            return scores;
        } catch (Exception ex) {
            return List.of();
        }
    }

    private static JsonNode readAnswers(List<Map<String, Object>> savedFiles) throws IOException {
        for (Map<String, Object> file : savedFiles) {
            String filename = String.valueOf(file.getOrDefault("filename", ""));
            String path = String.valueOf(file.getOrDefault("path", ""));
            if ("answers.json".equalsIgnoreCase(filename) || path.toLowerCase().endsWith("answers.json")) {
                return OBJECT_MAPPER.readTree(Files.readString(Path.of(path), StandardCharsets.UTF_8));
            }
        }
        return OBJECT_MAPPER.createObjectNode();
    }

    private static List<GraderPayloadTestcase> readTrialTestcases(Object rawValue, int questionNumber) {
        if (!(rawValue instanceof List<?> items)) {
            return List.of();
        }
        List<GraderPayloadTestcase> result = new ArrayList<>();
        for (Object item : items) {
            if (!(item instanceof Map<?, ?> map)) {
                continue;
            }
            String input = stringValue(map, "input").trim();
            String expected = stringValue(map, "expected");
            if (expected.isBlank()) {
                expected = stringValue(map, "output");
            }
            expected = expected.trim();
            if (!input.isBlank() || !expected.isBlank()) {
                result.add(new GraderPayloadTestcase(input, expected, questionNumber));
            }
        }
        return result;
    }

    private static String stringValue(Map<?, ?> map, String key) {
        Object value = map.get(key);
        return value == null ? "" : String.valueOf(value);
    }

    private static int asInt(Object value, int fallback) {
        if (value == null) {
            return fallback;
        }
        try {
            return Integer.parseInt(String.valueOf(value));
        } catch (NumberFormatException ex) {
            return fallback;
        }
    }

    private List<Map<String, Object>> saveFiles(Student student, List<SubmissionFileRequest> files, boolean autoGrade) throws IOException {
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

            if (originalFilename.toLowerCase().endsWith(".zip") && autoGrade) {
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
