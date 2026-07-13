package com.trs.backend.service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import com.trs.backend.dto.GraderPayload;
import com.trs.backend.dto.GraderPayloadFile;
import com.trs.backend.dto.GraderPayloadTestcase;
import com.trs.backend.dto.GraderResult;
import com.trs.backend.entity.Recommendation;
import com.trs.backend.entity.Submission;
import com.trs.backend.repository.RecommendationRepository;
import com.trs.backend.repository.SubmissionRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class SubmissionService {
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private final SubmissionRepository submissionRepository;
    private final RecommendationRepository recommendationRepository;
    private final RecommendationService recommendationService;
    private final RestTemplate restTemplate = new RestTemplate();
    private final String graderUrl;

    public SubmissionService(
            SubmissionRepository submissionRepository,
            RecommendationRepository recommendationRepository,
            RecommendationService recommendationService,
            @Value("${trs.grader.url}") String graderUrl) {
        this.submissionRepository = submissionRepository;
        this.recommendationRepository = recommendationRepository;
        this.recommendationService = recommendationService;
        this.graderUrl = graderUrl;
    }

    @Async
    @Transactional
    public void gradeAsync(UUID submissionId, GraderPayload payload) {
        Submission submission = submissionRepository.findById(submissionId).orElse(null);
        if (submission == null) {
            return;
        }

        try {
            ResponseEntity<GraderResult> response = restTemplate.postForEntity(graderUrl, payload, GraderResult.class);
            GraderResult result = response.getBody();
            if (response.getStatusCode().is2xxSuccessful() && result != null) {
                submission.setStatus(result.status() == null ? "SUCCESS" : result.status());
                submission.setScores(result.scores());
                submission.setFailedOutputs(result.failedOutputs() == null ? new LinkedHashMap<>() : result.failedOutputs());
                submission.setCompileError(result.compileError());
                submission.setRuntimeError(result.runtimeError());
            } else {
                submission.setStatus("FAILED");
                submission.setRuntimeError("Grader service returned status code " + response.getStatusCode().value());
            }
        } catch (Exception ex) {
            submission.setStatus("FAILED");
            submission.setRuntimeError("Failed to contact grader service: " + ex.getMessage());
        }

        submissionRepository.save(submission);

        try {
            recommendationRepository.findBySubmissionId(submission.getId()).ifPresent(recommendationRepository::delete);
            Recommendation recommendation = recommendationService.generateRecommendation(submission);
            recommendationRepository.save(recommendation);
        } catch (Exception ex) {
            Recommendation recommendation = new Recommendation();
            recommendation.setSubmission(submission);
            recommendation.setStatus("FAILED");
            recommendation.setRecommendedTestcases(List.of());
            recommendation.setFailedTestcases(RecommendationService.failedTestcaseIds(submission.getScores()));
            recommendation.setModelUsed("Fallback failed");
            recommendation.setSamplingGroup("Unknown");
            recommendation.setFallback(true);
            recommendationRepository.save(recommendation);
        }
    }

    public GraderResult gradeTrial(GraderPayload payload) {
        ResponseEntity<GraderResult> response = restTemplate.postForEntity(graderUrl, payload, GraderResult.class);
        GraderResult result = response.getBody();
        if (!response.getStatusCode().is2xxSuccessful() || result == null) {
            return new GraderResult(
                    "FAILED",
                    Map.of(),
                    Map.of(),
                    null,
                    "Grader service returned status code " + response.getStatusCode().value()
            );
        }
        return result;
    }

    public static List<GraderPayloadFile> readPayloadFiles(List<Map<String, Object>> savedFiles) {
        return savedFiles.stream().map(file -> {
            String filename = String.valueOf(file.getOrDefault("filename", ""));
            String path = String.valueOf(file.getOrDefault("path", ""));
            String content = "";
            try {
                content = Files.readString(Path.of(path), StandardCharsets.UTF_8);
            } catch (IOException ignored) {
                // Keep content empty so a missing optional upload does not stop grading.
            }
            return new GraderPayloadFile(filename, path, content);
        }).toList();
    }

    public static List<GraderPayloadTestcase> readCustomTestcases(String testcaseSamples) {
        if (testcaseSamples == null || testcaseSamples.isBlank()) {
            return List.of();
        }

        try {
            List<Map<String, Object>> parsed = OBJECT_MAPPER.readValue(
                    testcaseSamples,
                    new TypeReference<List<Map<String, Object>>>() {
                    }
            );
            return parsed.stream()
                    .map(item -> new GraderPayloadTestcase(
                            String.valueOf(item.getOrDefault("input", "")).trim(),
                            String.valueOf(item.getOrDefault("expected", item.getOrDefault("output", ""))).trim(),
                            readInteger(item.get("question"))
                    ))
                    .filter(item -> !item.input().isBlank() || !item.expected().isBlank())
                    .toList();
        } catch (Exception ignored) {
            return testcaseSamples.lines()
                    .map(String::trim)
                    .filter(line -> !line.isBlank())
                    .map(line -> {
                        String[] parts = line.split("\\s*(?:->|=>|\\|)\\s*", 2);
                        String input = parts.length > 0 ? parts[0].trim() : "";
                        String expected = parts.length > 1 ? parts[1].trim() : "";
                        return new GraderPayloadTestcase(input, expected, null);
                    })
                    .filter(item -> !item.input().isBlank() || !item.expected().isBlank())
                    .toList();
        }
    }

    private static Integer readInteger(Object value) {
        if (value == null) {
            return null;
        }
        try {
            return Integer.parseInt(String.valueOf(value));
        } catch (NumberFormatException ex) {
            return null;
        }
    }
}
