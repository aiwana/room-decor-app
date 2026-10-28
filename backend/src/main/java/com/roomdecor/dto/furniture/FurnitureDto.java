package com.roomdecor.dto.furniture;

import java.math.BigDecimal;
import java.util.UUID;

public record FurnitureDto(
    UUID id,
    String name,
    String category,
    Double width,
    Double height,
    Double depth,
    String modelUrl,
    String thumbnailUrl,
    UUID vendorId,
    String vendorName,
    BigDecimal price,
    String currency,
    String style,
    String material,
    String stockStatus
) {}
