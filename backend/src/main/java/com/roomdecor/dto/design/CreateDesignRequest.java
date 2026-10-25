package com.roomdecor.dto.design;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record CreateDesignRequest(
    @NotBlank String name,
    @NotNull UUID roomImageId
) {}
