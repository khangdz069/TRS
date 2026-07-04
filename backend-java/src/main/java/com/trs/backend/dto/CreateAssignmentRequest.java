package com.trs.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record CreateAssignmentRequest(
        String name,
        String description,
        @JsonProperty("start_date") String startDate,
        @JsonProperty("end_date") String endDate
) {
}
