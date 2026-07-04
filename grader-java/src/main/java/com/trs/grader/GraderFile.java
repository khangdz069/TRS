package com.trs.grader;

public record GraderFile(
        String filename,
        String path,
        String content
) {
    public String safeContent() {
        return content == null ? "" : content;
    }
}
