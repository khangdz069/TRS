package com.trs.backend.controller;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.trs.backend.entity.Recommendation;
import com.trs.backend.entity.Student;
import com.trs.backend.entity.Submission;
import com.trs.backend.repository.RecommendationRepository;
import com.trs.backend.repository.SubmissionRepository;
import com.trs.backend.service.AuthService;
import com.trs.backend.service.CurrentUser;
import com.trs.backend.service.DtoMapper;
import com.trs.backend.service.RecommendationService;

@RestController
@RequestMapping("/api/testcases")
public class RecommendationController {
    private final SubmissionRepository submissionRepository;
    private final RecommendationRepository recommendationRepository;
    private final AuthService authService;
    private final DtoMapper mapper;

    public RecommendationController(
            SubmissionRepository submissionRepository,
            RecommendationRepository recommendationRepository,
            AuthService authService,
            DtoMapper mapper) {
        this.submissionRepository = submissionRepository;
        this.recommendationRepository = recommendationRepository;
        this.authService = authService;
        this.mapper = mapper;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<?> getRecommendationDetails(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam(value = "submission_id", required = false) String submissionIdValue) {
        CurrentUser currentUser = authService.fromAuthorizationHeader(authorization).orElse(null);
        if (currentUser == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Missing or invalid authorization token"));
        }
        if (!authService.hasRole(currentUser, "STUDENT") || currentUser.student() == null) {
            return ResponseEntity.status(403).body(Map.of("error", "Permission denied"));
        }
        if (submissionIdValue == null || submissionIdValue.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "submission_id is required"));
        }

        UUID submissionId;
        try {
            submissionId = UUID.fromString(submissionIdValue);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(404).body(Map.of("error", "Submission not found or unauthorized"));
        }

        Student student = currentUser.student();
        Submission submission = submissionRepository.findByIdAndStudentId(submissionId, student.getId()).orElse(null);
        if (submission == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Submission not found or unauthorized"));
        }

        Recommendation recommendation = recommendationRepository.findBySubmissionId(submission.getId()).orElse(null);
        if (recommendation == null) {
            return ResponseEntity.status(404).body(Map.of("error", "No recommendation found for this submission"));
        }

        Map<String, Object> response = new LinkedHashMap<>(mapper.recommendation(recommendation));
        List<Integer> displayIds = recommendation.getRecommendedTestcases();
        response.put("details", buildTestcaseDetails(submission, displayIds));
        return ResponseEntity.ok(response);
    }

    private static List<Map<String, Object>> buildTestcaseDetails(Submission submission, List<Integer> testcaseIds) {
        List<Map<String, Object>> details = new ArrayList<>();
        Map<String, Object> failedOutputs = submission.getFailedOutputs() == null ? Map.of() : submission.getFailedOutputs();

        for (Integer testcaseId : testcaseIds) {
            boolean passed = RecommendationService.passed(submission.getScores(), testcaseId);
            Map<String, String> metadata = testcaseMetadata(testcaseId);
            Map<?, ?> failure = failedOutputs.get(String.valueOf(testcaseId)) instanceof Map<?, ?> map ? map : Map.of();
            String actual = stringValue(failure.get("actual"));
            if (actual == null) {
                actual = stringValue(failure.get("error"));
            }
            String expected = stringValue(failure.get("expected"));

            Map<String, Object> detail = new LinkedHashMap<>();
            detail.put("id", testcaseId);
            detail.put("input", metadata.get("parameters"));
            detail.put("parameters", metadata.get("parameters"));
            detail.put("output", metadata.get("output"));
            detail.put("expected_output", expected != null ? expected : (passed ? "Khớp" : "N/A"));
            detail.put("your_output", actual != null ? actual : (passed ? "Khớp" : "N/A"));
            detail.put("real_output", actual != null ? actual : (passed ? "Khớp" : "N/A"));
            detail.put("passed", passed);
            detail.put("status", passed ? "Đúng" : "Sai");
            details.add(detail);
        }

        return details;
    }

    private static Map<String, String> testcaseMetadata(int tcId) {
        int runArg = tcId - 1000;
        Map<String, String> metadata = new LinkedHashMap<>();
        metadata.put("parameters", "argv[1]=" + runArg);
        metadata.put("output", "stdout của chương trình");

        int[] sizes = {10, 50, 100, -1};
        if (tcId >= 1181 && tcId <= 1200) {
            int[] groups = {2, 3, 5, 10, 20};
            int offset = tcId - 1181;
            int k = groups[offset / 4];
            int sizeX = sizes[offset % 4];
            metadata.put("parameters", "argv[1]=" + runArg + "; k=" + k + "; size_X=" + sizeX + "; test_size=0.2; dataset=mnist.csv");
            metadata.put("output", "y_pred và y_test từ kNN.predict");
        }
        if (tcId >= 1201 && tcId <= 1220) {
            int[] groups = {5, 10, 20, 2, 3};
            int offset = tcId - 1201;
            int k = groups[offset / 4];
            int sizeX = sizes[offset % 4];
            metadata.put("parameters", "argv[1]=" + runArg + "; k=" + k + "; size_X=" + sizeX + "; test_size=0.2; dataset=mnist.csv");
            metadata.put("output", "Accuracy từ kNN.score");
        }
        return metadata;
    }

    private static String stringValue(Object value) {
        return value == null ? null : String.valueOf(value);
    }
}
