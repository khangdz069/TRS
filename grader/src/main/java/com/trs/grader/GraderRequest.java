package com.trs.grader;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

public record GraderRequest(
        @JsonProperty("submission_id") String submissionId,
        @JsonProperty("assignment_id") String assignmentId,
        @JsonProperty("student_id") String studentId,
        List<GraderFile> files,
        @JsonProperty("custom_testcases") List<GraderTestcase> customTestcases
) {
    public List<GraderFile> safeFiles() {
        return files == null ? List.of() : files;
    }

    public List<GraderTestcase> safeCustomTestcases() {
        return customTestcases == null ? List.of() : customTestcases;
    }
}
