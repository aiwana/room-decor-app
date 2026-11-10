package com.roomdecor.dto.design;

import com.roomdecor.entity.Design;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Request to update a design's name, room type, materials and/or furniture placements.
 * Fields left null keep their current value.
 */
public record UpdateDesignRequest(
    @Size(max = 200) String name,
    @Size(max = 50) String floorMaterial,
    @Size(max = 50) String wallMaterial,
    @Size(max = 50) String skirtingMaterial,
    List<PlacementDto> placements,
    @Pattern(regexp = Design.ROOM_TYPE_PATTERN) String roomType
) {
    public UpdateDesignRequest(String name, String floorMaterial, String wallMaterial,
                               String skirtingMaterial, List<PlacementDto> placements) {
        this(name, floorMaterial, wallMaterial, skirtingMaterial, placements, null);
    }
}
