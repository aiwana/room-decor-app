package com.roomdecor.dto.floorplan;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Create a floor plan without a photo: an empty room or a template room.
 * Sizes are in meters. walls is optional: without it (or with fewer than 3 walls)
 * the room is a roomWidth x roomDepth rectangle. Wall/opening coordinates use the
 * same top-down meters as the rest of the floor plan API.
 */
public record CreateBlankRoomRequest(
    @NotNull @DecimalMin("0.5") @DecimalMax("50") Double roomWidth,
    @NotNull @DecimalMin("0.5") @DecimalMax("50") Double roomDepth,
    @DecimalMin("1.8") @DecimalMax("6") Double ceilingHeight,
    @Valid @Size(max = 64) List<WallDto> walls,
    @Valid @Size(max = 30) List<OpeningDto> openings,
    @Size(max = 1000) String description
) {}
