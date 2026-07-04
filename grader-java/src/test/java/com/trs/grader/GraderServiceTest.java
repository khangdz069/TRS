package com.trs.grader;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class GraderServiceTest {
    @Test
    void normalizeOutputStripsTrailingSpacesAndEmptyLines() {
        String input = "hello  \r\nworld\t\n\n";

        assertEquals("hello\nworld", GraderService.normalizeOutput(input));
    }

    @Test
    void normalizeOutputTrimsOuterWhitespace() {
        String input = "  answer\n";

        assertEquals("answer", GraderService.normalizeOutput(input));
    }
}
