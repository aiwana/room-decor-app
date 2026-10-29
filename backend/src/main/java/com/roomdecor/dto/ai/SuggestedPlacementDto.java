package com.roomdecor.dto.ai;

/**
 * Where AI suggests putting one piece. x/y are 0..1 of the room width/depth (like placements).
 * {@code id} is the existing placement id, or a new id for a piece added from the catalog.
 */
public record SuggestedPlacementDto(
    String id,
    String furnitureId,
    double x,
    double y,
    double rotation,
    double scale
) {}
