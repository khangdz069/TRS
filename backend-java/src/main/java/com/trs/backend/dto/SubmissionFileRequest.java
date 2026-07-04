package com.trs.backend.dto;

public record SubmissionFileRequest(
        String filename,
        String content,
        String encoding
) {
}
