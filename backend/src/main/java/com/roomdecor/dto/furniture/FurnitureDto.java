package com.roomdecor.dto.furniture;

import java.util.UUID;

public record FurnitureDto(
    UUID id,
    String name,
    String category,
    Double width,
    Double height,
    Double depth,
    String modelUrl,
    String thumbnailUrl
) {}
