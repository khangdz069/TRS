package com.trs.backend.service;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import com.trs.backend.entity.Recommendation;
import com.trs.backend.entity.Submission;
import com.trs.backend.repository.RecommendationRepository;

@Service
public class RecommendationService {
    private final RecommendationRepository recommendationRepository;
    private final ModelRecommendationClient modelRecommendationClient;

    public RecommendationService(
            RecommendationRepository recommendationRepository,
            ModelRecommendationClient modelRecommendationClient) {
        this.recommendationRepository = recommendationRepository;
        this.modelRecommendationClient = modelRecommendationClient;
    }

    public Recommendation generateRecommendation(Submission submission) {
        List<Integer> failedIds = failedTestcaseIds(submission.getScores());
        Recommendation recommendation = new Recommendation();
        recommendation.setSubmission(submission);
        recommendation.setFailedTestcases(failedIds);

        if (failedIds.isEmpty()) {
            recommendation.setStatus("NO_TESTCASE");
            recommendation.setRecommendedTestcases(List.of());
            return recommendation;
        }

        OffsetDateTime startOfDay = LocalDate.now().atStartOfDay().atOffset(ZoneOffset.UTC);
        long dailyCount = recommendationRepository.countReadyForStudentSince(submission.getStudent().getId(), startOfDay);
        if (dailyCount >= 5) {
            recommendation.setStatus("DAILY_LIMIT_REACHED");
            recommendation.setRecommendedTestcases(List.of());
            return recommendation;
        }

        recommendationRepository.findPreviousReadyRecommendations(
                submission.getStudent().getId(),
                submission.getAssignment().getId(),
                submission.getId(),
                1,
                PageRequest.of(0, 1)
        ).stream().findFirst().ifPresent(previous -> {
            for (Integer tcId : previous.getRecommendedTestcases()) {
                if (!passed(submission.getScores(), tcId)) {
                    recommendation.setStatus("PREVIOUS_TESTCASE_NOT_COMPLETED");
                    recommendation.setRecommendedTestcases(previous.getRecommendedTestcases());
                    break;
                }
            }
        });

        if ("PREVIOUS_TESTCASE_NOT_COMPLETED".equals(recommendation.getStatus())) {
            return recommendation;
        }

        modelRecommendationClient.recommend(
                submission.getAssignment().getId().toString(),
                submission.getStudent().getMssv(),
                failedIds,
                3
        ).filter(response -> response.recommendedTestcases() != null && !response.recommendedTestcases().isEmpty())
                .ifPresentOrElse(response -> {
                    recommendation.setStatus(response.status() == null ? "READY" : response.status());
                    recommendation.setRecommendedTestcases(response.recommendedTestcases());
                    recommendation.setModelUsed(response.modelUsed());
                    recommendation.setSamplingGroup(response.samplingGroup());
                    recommendation.setFallback(response.fallback());
                }, () -> {
                    recommendation.setStatus("READY");
                    recommendation.setRecommendedTestcases(failedIds.stream().limit(3).toList());
                    recommendation.setModelUsed("Fallback (Simple Java)");
                    recommendation.setSamplingGroup("Unknown");
                    recommendation.setFallback(true);
                });
        return recommendation;
    }

    public static List<Integer> failedTestcaseIds(Object scores) {
        List<Integer> failed = new ArrayList<>();
        scores = JsonValues.normalize(scores);
        if (scores instanceof Map<?, ?> map) {
            map.forEach((key, value) -> {
                if (!isPassedValue(value)) {
                    try {
                        failed.add(Integer.parseInt(String.valueOf(key)));
                    } catch (NumberFormatException ignored) {
                        // Ignore unknown testcase keys.
                    }
                }
            });
            return failed;
        }

        if (scores instanceof List<?> list) {
            for (int i = 0; i < list.size() && i < TestcaseCatalog.TESTCASE_IDS.size(); i++) {
                if (!isPassedValue(list.get(i))) {
                    failed.add(TestcaseCatalog.TESTCASE_IDS.get(i));
                }
            }
        }

        return failed;
    }

    public static boolean passed(Object scores, int tcId) {
        scores = JsonValues.normalize(scores);
        if (scores instanceof Map<?, ?> map) {
            return isPassedValue(map.get(String.valueOf(tcId)));
        }
        if (scores instanceof List<?> list && TestcaseCatalog.TESTCASE_IDS.contains(tcId)) {
            int idx = TestcaseCatalog.TESTCASE_IDS.indexOf(tcId);
            return idx < list.size() && isPassedValue(list.get(idx));
        }
        return false;
    }

    private static boolean isPassedValue(Object value) {
        if (value instanceof Boolean passed) {
            return passed;
        }
        return "true".equalsIgnoreCase(String.valueOf(value));
    }
}
