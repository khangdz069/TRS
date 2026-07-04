package com.trs.backend.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

public record FeedbackRequest(
        @JsonProperty("submission_id") String submissionId,
        Integer scores,
        @JsonProperty("list_used_tcids") List<Integer> listUsedTcids,
        @JsonProperty("time_ordered_tcids") List<Integer> timeOrderedTcids,
        String feedback
) {
    public List<Integer> safeListUsedTcids() {
        return listUsedTcids == null ? List.of() : listUsedTcids;
    }

    public List<Integer> safeTimeOrderedTcids() {
        return timeOrderedTcids == null ? List.of() : timeOrderedTcids;
    }
}
