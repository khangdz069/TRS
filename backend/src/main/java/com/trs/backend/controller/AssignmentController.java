package com.trs.backend.controller;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.Set;

import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.trs.backend.dto.CreateAssignmentRequest;
import com.trs.backend.entity.Assignment;
import com.trs.backend.entity.Student;
import com.trs.backend.entity.StudentOnAssignment;
import com.trs.backend.entity.Teacher;
import com.trs.backend.entity.TeacherOnAssignment;
import com.trs.backend.repository.AssignmentRepository;
import com.trs.backend.repository.StudentOnAssignmentRepository;
import com.trs.backend.repository.StudentRepository;
import com.trs.backend.repository.TeacherOnAssignmentRepository;
import com.trs.backend.service.AuthService;
import com.trs.backend.service.CurrentUser;
import com.trs.backend.service.DtoMapper;

@RestController
@RequestMapping("/api/assignments")
public class AssignmentController {
    private final AssignmentRepository assignmentRepository;
    private final StudentRepository studentRepository;
    private final StudentOnAssignmentRepository studentOnAssignmentRepository;
    private final TeacherOnAssignmentRepository teacherOnAssignmentRepository;
    private final AuthService authService;
    private final DtoMapper mapper;

    public AssignmentController(
            AssignmentRepository assignmentRepository,
            StudentRepository studentRepository,
            StudentOnAssignmentRepository studentOnAssignmentRepository,
            TeacherOnAssignmentRepository teacherOnAssignmentRepository,
            AuthService authService,
            DtoMapper mapper) {
        this.assignmentRepository = assignmentRepository;
        this.studentRepository = studentRepository;
        this.studentOnAssignmentRepository = studentOnAssignmentRepository;
        this.teacherOnAssignmentRepository = teacherOnAssignmentRepository;
        this.authService = authService;
        this.mapper = mapper;
    }

    @PostMapping
    @Transactional
    public ResponseEntity<?> createAssignment(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody(required = false) CreateAssignmentRequest request) {
        CurrentUser currentUser = currentUser(authorization);
        if (currentUser == null) {
            return unauthorized();
        }
        if (!authService.hasRole(currentUser, "TEACHER") || currentUser.teacher() == null) {
            return ResponseEntity.status(403).body(Map.of("error", "Permission denied"));
        }
        if (request == null || isBlank(request.name()) || isBlank(request.startDate()) || isBlank(request.endDate())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Missing name, start_date or end_date"));
        }
        if (assignmentRepository.findByName(request.name()).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Assignment name already exists"));
        }

        OffsetDateTime startDate;
        OffsetDateTime endDate;
        try {
            startDate = parseDate(request.startDate());
            endDate = parseDate(request.endDate());
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid date format. Use ISO-8601 format."));
        }

        Assignment assignment = new Assignment();
        applyAssignmentRequest(assignment, request, startDate, endDate);
        assignment.setAuthor(currentUser.teacher());
        assignmentRepository.save(assignment);

        TeacherOnAssignment ownership = new TeacherOnAssignment();
        ownership.setTeacher(currentUser.teacher());
        ownership.setAssignment(assignment);
        ownership.setLeader(true);
        teacherOnAssignmentRepository.save(ownership);

        return ResponseEntity.status(201).body(mapper.assignment(assignment));
    }

    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<?> updateAssignment(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable String id,
            @RequestBody(required = false) CreateAssignmentRequest request) {
        CurrentUser currentUser = currentUser(authorization);
        if (currentUser == null) {
            return unauthorized();
        }
        if (!authService.hasRole(currentUser, "TEACHER") || currentUser.teacher() == null) {
            return ResponseEntity.status(403).body(Map.of("error", "Permission denied"));
        }

        UUID assignmentId = parseUuid(id);
        if (assignmentId == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Assignment not found"));
        }
        Assignment assignment = assignmentRepository.findById(assignmentId).orElse(null);
        if (assignment == null || !assignment.isActive()) {
            return ResponseEntity.status(404).body(Map.of("error", "Assignment not found"));
        }
        if (!assignment.getAuthor().getId().equals(currentUser.teacher().getId())) {
            return ResponseEntity.status(403).body(Map.of("error", "Permission denied"));
        }
        if (request == null || isBlank(request.name()) || isBlank(request.startDate()) || isBlank(request.endDate())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Missing name, start_date or end_date"));
        }
        if (assignmentRepository.findByName(request.name())
                .filter(existing -> !existing.getId().equals(assignment.getId()))
                .isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Assignment name already exists"));
        }

        OffsetDateTime startDate;
        OffsetDateTime endDate;
        try {
            startDate = parseDate(request.startDate());
            endDate = parseDate(request.endDate());
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid date format. Use ISO-8601 format."));
        }

        applyAssignmentRequest(assignment, request, startDate, endDate);
        assignmentRepository.save(assignment);
        return ResponseEntity.ok(mapper.assignment(assignment));
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> deleteAssignment(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable String id) {
        CurrentUser currentUser = currentUser(authorization);
        if (currentUser == null) {
            return unauthorized();
        }
        if (!authService.hasRole(currentUser, "TEACHER") || currentUser.teacher() == null) {
            return ResponseEntity.status(403).body(Map.of("error", "Permission denied"));
        }

        UUID assignmentId = parseUuid(id);
        if (assignmentId == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Assignment not found"));
        }
        Assignment assignment = assignmentRepository.findById(assignmentId).orElse(null);
        if (assignment == null || !assignment.isActive()) {
            return ResponseEntity.status(404).body(Map.of("error", "Assignment not found"));
        }
        if (!assignment.getAuthor().getId().equals(currentUser.teacher().getId())) {
            return ResponseEntity.status(403).body(Map.of("error", "Permission denied"));
        }

        assignment.setActive(false);
        assignment.setDeletedAt(OffsetDateTime.now());
        assignmentRepository.save(assignment);
        return ResponseEntity.noContent().build();
    }

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<?> getAssignments(@RequestHeader(value = "Authorization", required = false) String authorization) {
        CurrentUser currentUser = currentUser(authorization);
        if (currentUser == null) {
            return unauthorized();
        }

        List<Assignment> assignments;
        if ("TEACHER".equals(currentUser.account().getRole())) {
            Teacher teacher = currentUser.teacher();
            assignments = teacher == null ? List.of() : assignmentRepository.findByAuthorIdAndActiveTrueOrderByCreatedAtDesc(teacher.getId());
        } else {
            Student student = currentUser.student();
            assignments = student == null ? List.of() : assignmentRepository.findActiveByStudentId(student.getId());
        }

        boolean studentView = "STUDENT".equals(currentUser.account().getRole());
        return ResponseEntity.ok(assignments.stream()
                .map(assignment -> studentView ? mapper.assignmentForStudent(assignment) : mapper.assignment(assignment))
                .toList());
    }

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getAssignmentDetail(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable String id) {
        CurrentUser currentUser = currentUser(authorization);
        if (currentUser == null) {
            return unauthorized();
        }

        UUID assignmentId = parseUuid(id);
        if (assignmentId == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Assignment not found"));
        }

        Assignment assignment = assignmentRepository.findById(assignmentId).orElse(null);
        if (assignment == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Assignment not found"));
        }

        if ("STUDENT".equals(currentUser.account().getRole())) {
            Student student = currentUser.student();
            boolean registered = student != null && studentOnAssignmentRepository
                    .findByStudentIdAndAssignmentIdAndActiveTrue(student.getId(), assignment.getId())
                    .isPresent();
            if (!registered) {
                return ResponseEntity.status(403).body(Map.of("error", "You are not registered in this assignment"));
            }
        }

        Map<String, Object> response = new LinkedHashMap<>(
                "STUDENT".equals(currentUser.account().getRole())
                        ? mapper.assignmentForStudent(assignment)
                        : mapper.assignment(assignment)
        );
        if ("TEACHER".equals(currentUser.account().getRole())) {
            response.put("student_list", studentRepository.findActiveByAssignmentId(assignment.getId())
                    .stream()
                    .map(mapper::student)
                    .toList());
            response.put("class_rosters", studentOnAssignmentRepository
                    .findActiveRosterByAssignmentId(assignment.getId())
                    .stream()
                    .collect(java.util.stream.Collectors.groupingBy(
                            registration -> registration.getClassSection() == null ? "Default" : registration.getClassSection(),
                            LinkedHashMap::new,
                            java.util.stream.Collectors.toList()))
                    .entrySet()
                    .stream()
                    .map(entry -> {
                        Map<String, Object> classMap = new LinkedHashMap<>();
                        classMap.put("name", entry.getKey());
                        classMap.put("student_count", entry.getValue().size());
                        classMap.put("students", entry.getValue().stream()
                                .map(StudentOnAssignment::getStudent)
                                .map(mapper::student)
                                .toList());
                        return classMap;
                    })
                    .toList());
        }

        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/models/rsvd/rebuild")
    public ResponseEntity<?> rebuildRsvdModel(@PathVariable String id) {
        return ResponseEntity.status(501).body(Map.of(
                "error", "RSVD rebuild is not supported in the Java backend yet.",
                "assignment_id", id
        ));
    }

    private CurrentUser currentUser(String authorization) {
        return authService.fromAuthorizationHeader(authorization).orElse(null);
    }

    private static ResponseEntity<Map<String, String>> unauthorized() {
        return ResponseEntity.status(401).body(Map.of("error", "Missing or invalid authorization token"));
    }

    private static OffsetDateTime parseDate(String value) {
        String trimmed = value.trim();
        if (trimmed.length() == 10) {
            return LocalDate.parse(trimmed).atStartOfDay().atOffset(ZoneOffset.UTC);
        }
        return OffsetDateTime.parse(trimmed.replace("Z", "+00:00"));
    }

    private static UUID parseUuid(String value) {
        try {
            return UUID.fromString(value);
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private static void applyAssignmentRequest(
            Assignment assignment,
            CreateAssignmentRequest request,
            OffsetDateTime startDate,
            OffsetDateTime endDate) {
        assignment.setName(request.name());
        assignment.setDescription(request.description() == null ? "" : request.description());
        assignment.setAssignmentType(normalizeAssignmentType(request.assignmentType()));
        assignment.setSupportedLanguages(normalizeLanguages(request.supportedLanguages()));
        assignment.setTestcaseSamples(request.testcaseSamples() == null ? "" : request.testcaseSamples());
        assignment.setTestcaseGenerationStrategy(normalizeGenerationStrategy(request.testcaseGenerationStrategy()));
        assignment.setTestcaseSeedCount(nonNegative(request.testcaseSeedCount()));
        assignment.setGeneratedTestcaseCount(nonNegative(request.generatedTestcaseCount()));
        assignment.setProblemStatement(request.problemStatement() == null ? "" : request.problemStatement());
        assignment.setStarterCode(request.starterCode() == null ? "" : request.starterCode());
        assignment.setReferenceSolution(request.referenceSolution() == null ? "" : request.referenceSolution());
        assignment.setTypeConfig(request.typeConfig() == null ? "" : request.typeConfig());
        assignment.setStartDate(startDate);
        assignment.setEndDate(endDate);
    }

    private static String normalizeAssignmentType(String value) {
        String normalized = value == null ? "STANDARD" : value.trim().toUpperCase();
        Set<String> allowed = Set.of("STANDARD", "FILL_BLANK", "DEBUGGING", "PROJECT", "QUIZ_CODE");
        return allowed.contains(normalized) ? normalized : "STANDARD";
    }

    private static String normalizeGenerationStrategy(String value) {
        String normalized = value == null ? "MUTATION" : value.trim().toUpperCase();
        Set<String> allowed = Set.of("MUTATION", "BOUNDARY", "RANDOMIZED", "PAIRWISE");
        return allowed.contains(normalized) ? normalized : "MUTATION";
    }

    private static String normalizeLanguages(String value) {
        if (value == null || value.isBlank()) {
            return "c";
        }
        return java.util.Arrays.stream(value.split(","))
                .map(String::trim)
                .filter(item -> !item.isBlank())
                .map(String::toLowerCase)
                .distinct()
                .limit(12)
                .reduce((left, right) -> left + "," + right)
                .orElse("c");
    }

    private static int nonNegative(Integer value) {
        return value == null ? 0 : Math.max(0, value);
    }
}
