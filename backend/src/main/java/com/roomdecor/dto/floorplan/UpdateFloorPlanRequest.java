package com.roomdecor.dto.floorplan;

import java.util.List;

/**
 * Request to manually correct an AI-generated floor plan.
 */
public record UpdateFloorPlanRequest(
    Double roomWidth,
    Double roomDepth,
    Double ceilingHeight,
    List<WallDto> walls,
    List<OpeningDto> openings,
    Integer pixelsPerMeter
) {}
