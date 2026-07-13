package com.trs.backend.dto;

public record GraderPayloadTestcase(
        String input,
        String expected,
        Integer question
) {
}
