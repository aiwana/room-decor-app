package com.roomdecor.dto.furniture;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/**
 * Body for ADMIN create/update of a catalog item (POST and PUT /api/admin/furniture).
 * Sizes use the same unit as the existing catalog rows (centimetres).
 * Vendor is not editable here; an update keeps the item's current vendor.
 */
public record FurnitureRequest(
    @NotBlank @Size(max = 200) String name,
    @NotBlank @Size(max = 100) String category,
    @NotNull @Positive Double width,
    @NotNull @Positive Double height,
    @NotNull @Positive Double depth,
    @Size(max = 2000) String modelUrl,
    @Size(max = 2000) String thumbnailUrl,
    @PositiveOrZero BigDecimal price,
    @Size(max = 10) String currency,
    @Size(max = 50) String style,
    @Size(max = 100) String material,
    @Pattern(regexp = "in_stock|out_of_stock|preorder",
        message = "must be in_stock, out_of_stock or preorder") String stockStatus
) {}
