package com.roomdecor.dto.design;

import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Request to update a design's name, materials and/or furniture placements.
 */
public record UpdateDesignRequest(
    String name,
    @Size(max = 50) String floorMaterial,
    @Size(max = 50) String wallMaterial,
    List<PlacementDto> placements
) {}
