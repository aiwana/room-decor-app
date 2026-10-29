package com.roomdecor.dto.ai;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * One piece of furniture already in the room. Ids are strings because the app may use
 * sample furniture (ids like "sample-sofa-3") when the catalog is empty.
 * Sizes are in centimeters, x/y are 0..1 of the room width/depth (center of the piece).
 */
public record LayoutItemDto(
    @NotBlank @Size(max = 64) String placementId,
    @NotBlank @Size(max = 64) String furnitureId,
    @Size(max = 200) String name,
    @Size(max = 100) String category,
    @NotNull @DecimalMin("1") @DecimalMax("2000") Double width,
    @NotNull @DecimalMin("1") @DecimalMax("2000") Double depth,
    @DecimalMin("0") @DecimalMax("1000") Double height,
    @NotNull @DecimalMin("0") @DecimalMax("1") Double x,
    @NotNull @DecimalMin("0") @DecimalMax("1") Double y,
    Double rotation,
    @DecimalMin("0.1") @DecimalMax("10") Double scale
) {}
