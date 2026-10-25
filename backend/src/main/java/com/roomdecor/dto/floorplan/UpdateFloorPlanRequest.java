package com.roomdecor.dto.floorplan;

import jakarta.validation.constraints.NotNull;

import java.util.List;

/**
 * Request to manually correct an AI-generated floor plan.
 */
public record UpdateFloorPlanRequest(
    Double roomWidth,
    Double roomDepth,
    Double ceilingHeight,
    List<WallDto> walls,
    Integer pixelsPerMeter
) {}
