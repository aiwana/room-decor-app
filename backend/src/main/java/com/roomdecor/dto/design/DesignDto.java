package com.roomdecor.dto.design;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record DesignDto(
    UUID id,
    String name,
    UUID roomImageId,
    String floorMaterial,
    String wallMaterial,
    List<PlacementDto> placements,
    Instant createdAt,
    Instant updatedAt
) {}
