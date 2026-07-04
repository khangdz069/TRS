package com.trs.backend.dto;

public record GraderPayloadFile(
        String filename,
        String path,
        String content
) {
}
