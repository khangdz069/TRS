package com.trs.grader;

public record GraderTestcase(
        String input,
        String expected,
        Integer question
) {
    public String safeInput() {
        return input == null ? "" : input;
    }

    public String safeExpected() {
        return expected == null ? "" : expected;
    }

    public int safeQuestion() {
        return question == null || question < 1 ? 1 : question;
    }
}
