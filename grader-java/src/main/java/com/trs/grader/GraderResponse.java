package com.trs.grader;

import java.util.Map;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record GraderResponse(
        String status,
        Object scores,
        @JsonProperty("failed_outputs") Map<String, FailedOutput> failedOutputs,
        @JsonProperty("compile_error") String compileError,
        @JsonProperty("runtime_error") String runtimeError
) {
}
