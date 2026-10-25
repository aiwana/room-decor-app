package com.roomdecor.exception;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;
import java.util.Map;

/**
 * Single JSON shape for every API error:
 * {"timestamp": "...", "status": 400, "message": "...", "errors": {"field": "reason"}}
 * "errors" is only present for validation failures.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ErrorResponse(
    Instant timestamp,
    int status,
    String message,
    Map<String, String> errors
) {
    public static ErrorResponse of(int status, String message) {
        return new ErrorResponse(Instant.now(), status, message, null);
    }

    public static ErrorResponse of(int status, String message, Map<String, String> errors) {
        return new ErrorResponse(Instant.now(), status, message, errors);
    }
}
