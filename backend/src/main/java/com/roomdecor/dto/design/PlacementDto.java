package com.roomdecor.dto.design;

import java.util.UUID;

public record PlacementDto(
    UUID id,
    UUID furnitureId,
    Double x,
    Double y,
    Double rotation,
    Double scale
) {}
