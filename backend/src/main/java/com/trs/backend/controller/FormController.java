package com.trs.backend.controller;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.trs.backend.dto.FeedbackRequest;
import com.trs.backend.model.FeedbackForm;
import com.trs.backend.model.Recommendation;
import com.trs.backend.model.Submission;
import com.trs.backend.repository.FeedbackFormRepository;
import com.trs.backend.repository.RecommendationRepository;
import com.trs.backend.repository.SubmissionRepository;
import com.trs.backend.service.AuthService;
import com.trs.backend.service.CurrentUser;
import com.trs.backend.service.DtoMapper;

@RestController
@RequestMapping("/api/forms")
public class FormController {
    private final FeedbackFormRepository feedbackFormRepository;
    private final SubmissionRepository submissionRepository;
    private final RecommendationRepository recommendationRepository;
    private final AuthService authService;
    private final DtoMapper mapper;

    public FormController(
            FeedbackFormRepository feedbackFormRepository,
            SubmissionRepository submissionRepository,
            RecommendationRepository recommendationRepository,
            AuthService authService,
            DtoMapper mapper) {
        this.feedbackFormRepository = feedbackFormRepository;
        this.submissionRepository = submissionRepository;
        this.recommendationRepository = recommendationRepository;
        this.authService = authService;
        this.mapper = mapper;
    }

    @PostMapping
    @Transactional
    public ResponseEntity<?> submitFeedback(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody(required = false) FeedbackRequest request) {
        CurrentUser currentUser = authService.fromAuthorizationHeader(authorization).orElse(null);
        if (currentUser == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Missing or invalid authorization token"));
        }
        if (!authService.hasRole(currentUser, "STUDENT") || currentUser.student() == null) {
            return ResponseEntity.status(403).body(Map.of("error", "Permission denied"));
        }
        if (request == null || request.submissionId() == null || request.scores() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "submission_id and scores are required"));
        }

        UUID submissionId;
        try {
            submissionId = UUID.fromString(request.submissionId());
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(404).body(Map.of("error", "Submission not found or unauthorized"));
        }

        Submission submission = submissionRepository.findByIdAndStudentId(submissionId, currentUser.student().getId()).orElse(null);
        if (submission == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Submission not found or unauthorized"));
        }
        if (feedbackFormRepository.findBySubmissionId(submission.getId()).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Feedback form already submitted for this submission"));
        }

        FeedbackForm form = new FeedbackForm();
        form.setSubmission(submission);
        form.setScores(request.scores());
        form.setListUsedTcids(request.safeListUsedTcids());
        form.setTimeOrderedTcids(request.safeTimeOrderedTcids());
        form.setFeedback(request.feedback() == null ? "" : request.feedback());
        feedbackFormRepository.save(form);

        recommendationRepository.findBySubmissionId(submission.getId()).ifPresent(recommendation -> {
            recommendation.setFilledForm(true);
            recommendationRepository.save(recommendation);
        });

        return ResponseEntity.status(201).body(mapper.feedbackForm(form));
    }

    @GetMapping("/analytics")
    @Transactional(readOnly = true)
    public ResponseEntity<?> analytics(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam(value = "assignment_id", required = false) String assignmentIdValue) {
        CurrentUser currentUser = authService.fromAuthorizationHeader(authorization).orElse(null);
        if (currentUser == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Missing or invalid authorization token"));
        }
        if (!authService.hasRole(currentUser, "TEACHER")) {
            return ResponseEntity.status(403).body(Map.of("error", "Permission denied"));
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

        List<FeedbackForm> forms = feedbackFormRepository.findByAssignmentId(assignmentId);
        if (forms.isEmpty()) {
            return ResponseEntity.ok(Map.of(
                    "total", 0,
                    "average_rating", 0,
                    "testcase_stats", Map.of(),
                    "feedbacks", List.of()
            ));
        }

        int totalRating = 0;
        Map<String, Integer> testcaseStats = new LinkedHashMap<>();
        List<Map<String, Object>> feedbacks = new ArrayList<>();

        for (FeedbackForm form : forms) {
            totalRating += form.getScores();
            for (Integer tc : form.getListUsedTcids()) {
                testcaseStats.put(String.valueOf(tc), testcaseStats.getOrDefault(String.valueOf(tc), 0) + 1);
            }
            if (form.getFeedback() != null && !form.getFeedback().isBlank()) {
                feedbacks.add(Map.of(
                        "rating", form.getScores(),
                        "text", form.getFeedback(),
                        "created_at", form.getCreatedAt() == null ? "" : form.getCreatedAt().toString()
                ));
            }
        }

        return ResponseEntity.ok(Map.of(
                "total", forms.size(),
                "average_rating", (double) totalRating / forms.size(),
                "testcase_stats", testcaseStats,
                "feedbacks", feedbacks
        ));
    }
}
