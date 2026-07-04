package com.trs.grader;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@CrossOrigin
@RestController
public class GraderController {
    private final GraderService graderService;

    public GraderController(GraderService graderService) {
        this.graderService = graderService;
    }

    @GetMapping("/")
    public Map<String, String> root() {
        return Map.of(
                "message", "TRS Real C++ Grader API is running (Spring Boot)",
                "docs", "POST to /api/grader to grade submission"
        );
    }

    @GetMapping("/api/health")
    public Map<String, String> health() {
        return Map.of(
                "service", "grader",
                "status", "ok"
        );
    }

    @PostMapping("/api/grader")
    public ResponseEntity<?> gradeSubmission(@RequestBody(required = false) GraderRequest request) {
        if (request == null
                || isBlank(request.submissionId())
                || isBlank(request.assignmentId())
                || isBlank(request.studentId())) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Missing submission_id, assignment_id, or student_id"));
        }

        GradeOutcome outcome = graderService.grade(request);
        return ResponseEntity.status(outcome.status()).body(outcome.body());
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
