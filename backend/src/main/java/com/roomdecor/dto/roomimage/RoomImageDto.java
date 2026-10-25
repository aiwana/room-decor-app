package com.roomdecor.dto.roomimage;

import java.time.Instant;
import java.util.UUID;

/**
 * Room image returned by the API. Never exposes the owning User entity
 * (it would leak the password hash and fail on the lazy proxy).
 */
public record RoomImageDto(
    UUID id,
    String url,
    Integer width,
    Integer height,
    Instant capturedAt
) {}
