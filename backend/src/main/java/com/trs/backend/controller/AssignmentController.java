package com.trs.backend.controller;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.trs.backend.dto.CreateAssignmentRequest;
import com.trs.backend.entity.Assignment;
import com.trs.backend.entity.Student;
import com.trs.backend.entity.Teacher;
import com.trs.backend.repository.AssignmentRepository;
import com.trs.backend.repository.StudentOnAssignmentRepository;
import com.trs.backend.repository.StudentRepository;
import com.trs.backend.service.AuthService;
import com.trs.backend.service.CurrentUser;
import com.trs.backend.service.DtoMapper;

@RestController
@RequestMapping("/api/assignments")
public class AssignmentController {
    private final AssignmentRepository assignmentRepository;
    private final StudentRepository studentRepository;
    private final StudentOnAssignmentRepository studentOnAssignmentRepository;
    private final AuthService authService;
    private final DtoMapper mapper;

    public AssignmentController(
            AssignmentRepository assignmentRepository,
            StudentRepository studentRepository,
            StudentOnAssignmentRepository studentOnAssignmentRepository,
            AuthService authService,
            DtoMapper mapper) {
        this.assignmentRepository = assignmentRepository;
        this.studentRepository = studentRepository;
        this.studentOnAssignmentRepository = studentOnAssignmentRepository;
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
        assignment.setName(request.name());
        assignment.setDescription(request.description() == null ? "" : request.description());
        assignment.setStartDate(startDate);
        assignment.setEndDate(endDate);
        assignment.setAuthor(currentUser.teacher());
        assignmentRepository.save(assignment);

        return ResponseEntity.status(201).body(mapper.assignment(assignment));
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
            assignments = teacher == null ? List.of() : assignmentRepository.findByAuthorIdOrderByCreatedAtDesc(teacher.getId());
        } else {
            Student student = currentUser.student();
            assignments = student == null ? List.of() : assignmentRepository.findActiveByStudentId(student.getId());
        }

        return ResponseEntity.ok(assignments.stream().map(mapper::assignment).toList());
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

        Map<String, Object> response = new LinkedHashMap<>(mapper.assignment(assignment));
        if ("TEACHER".equals(currentUser.account().getRole())) {
            response.put("student_list", studentRepository.findActiveByAssignmentId(assignment.getId())
                    .stream()
                    .map(mapper::student)
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
}
