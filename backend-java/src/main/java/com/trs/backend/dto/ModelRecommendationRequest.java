package com.trs.backend.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ModelRecommendationRequest(
        @JsonProperty("assignment_id") String assignmentId,
        @JsonProperty("student_mssv") String studentMssv,
        @JsonProperty("failed_testcases") List<Integer> failedTestcases,
        Integer limit
) {
}
