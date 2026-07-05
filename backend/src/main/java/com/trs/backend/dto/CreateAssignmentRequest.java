package com.trs.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record CreateAssignmentRequest(
        String name,
        String description,
        @JsonProperty("assignment_type") String assignmentType,
        @JsonProperty("supported_languages") String supportedLanguages,
        @JsonProperty("testcase_samples") String testcaseSamples,
        @JsonProperty("testcase_generation_strategy") String testcaseGenerationStrategy,
        @JsonProperty("testcase_seed_count") Integer testcaseSeedCount,
        @JsonProperty("generated_testcase_count") Integer generatedTestcaseCount,
        @JsonProperty("problem_statement") String problemStatement,
        @JsonProperty("starter_code") String starterCode,
        @JsonProperty("reference_solution") String referenceSolution,
        @JsonProperty("type_config") String typeConfig,
        @JsonProperty("start_date") String startDate,
        @JsonProperty("end_date") String endDate
) {
}
