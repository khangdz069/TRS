package com.trs.backend.dto;

import java.util.Map;

import com.fasterxml.jackson.annotation.JsonProperty;

public record GraderResult(
        String status,
        Object scores,
        @JsonProperty("failed_outputs") Map<String, Object> failedOutputs,
        @JsonProperty("compile_error") String compileError,
        @JsonProperty("runtime_error") String runtimeError
) {
}
