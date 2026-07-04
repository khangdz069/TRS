package com.trs.backend.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

public record CreateSubmissionRequest(
        @JsonProperty("assignment_id") String assignmentId,
        List<SubmissionFileRequest> files
) {
    public List<SubmissionFileRequest> safeFiles() {
        return files == null ? List.of() : files;
    }
}
