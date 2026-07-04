package com.trs.grader;

import org.springframework.http.HttpStatus;

public record GradeOutcome(
        GraderResponse body,
        HttpStatus status
) {
    public static GradeOutcome ok(GraderResponse body) {
        return new GradeOutcome(body, HttpStatus.OK);
    }

    public static GradeOutcome serverError(GraderResponse body) {
        return new GradeOutcome(body, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
