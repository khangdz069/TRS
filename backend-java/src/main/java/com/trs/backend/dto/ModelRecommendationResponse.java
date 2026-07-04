package com.trs.backend.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ModelRecommendationResponse(
        String status,
        @JsonProperty("recommended_testcases") List<Integer> recommendedTestcases,
        @JsonProperty("failed_testcases") List<Integer> failedTestcases,
        @JsonProperty("model_used") String modelUsed,
        @JsonProperty("sampling_group") String samplingGroup,
        Boolean fallback
) {
}
