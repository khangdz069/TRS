package com.trs.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

public final class JsonValues {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private JsonValues() {
    }

    public static Object normalize(Object value) {
        if (value instanceof String text) {
            String trimmed = text.trim();
            if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
                try {
                    return MAPPER.readValue(trimmed, Object.class);
                } catch (JsonProcessingException ignored) {
                    return value;
                }
            }
        }
        return value;
    }

    public static String toJsonText(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof String text) {
            return text;
        }
        try {
            return MAPPER.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            return String.valueOf(value);
        }
    }
}
