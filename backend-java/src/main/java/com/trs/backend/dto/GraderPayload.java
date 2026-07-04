package com.trs.backend.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

public record GraderPayload(
        @JsonProperty("submission_id") String submissionId,
        @JsonProperty("assignment_id") String assignmentId,
        @JsonProperty("student_id") String studentId,
        List<GraderPayloadFile> files
) {
}
