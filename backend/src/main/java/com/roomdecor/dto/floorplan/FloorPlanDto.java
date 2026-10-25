package com.roomdecor.dto.floorplan;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record FloorPlanDto(
    UUID id,
    UUID roomImageId,
    Double roomWidth,
    Double roomDepth,
    Double ceilingHeight,
    List<WallDto> walls,
    Integer pixelsPerMeter,
    String description,
    Instant createdAt,
    Instant updatedAt
) {}
