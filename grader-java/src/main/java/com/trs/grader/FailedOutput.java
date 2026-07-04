package com.trs.grader;

public record FailedOutput(
        String expected,
        String actual,
        String error
) {
}
