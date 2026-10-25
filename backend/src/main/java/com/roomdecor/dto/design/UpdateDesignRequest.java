package com.roomdecor.dto.design;

import java.util.List;

/**
 * Request to update a design's name and/or furniture placements.
 */
public record UpdateDesignRequest(
    String name,
    List<PlacementDto> placements
) {}
