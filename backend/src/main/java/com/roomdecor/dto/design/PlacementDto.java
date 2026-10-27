package com.roomdecor.dto.design;

import java.util.UUID;
import jakarta.validation.constraints.*;

public record PlacementDto(
    UUID id,
    @NotNull UUID furnitureId,
    @NotNull Double x,
    @NotNull Double y,
    @NotNull Double rotation,
    @NotNull @Positive Double scale
) {}
