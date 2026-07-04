package com.trs.backend.dto;

public record LoginRequest(
        String email,
        String name
) {
}
