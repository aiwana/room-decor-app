package com.roomdecor.dto.furniture;

import jakarta.validation.constraints.*;

/** Dimensions use centimeters, preserving the existing catalog contract. */
public record FurnitureRequest(
    @NotBlank @Size(max = 200) String name,
    @NotBlank @Size(max = 100) String category,
    @NotNull @Positive Double width,
    @NotNull @Positive Double height,
    @NotNull @Positive Double depth,
    @Size(max = 2048) @Pattern(regexp = "^(https?://[^\\s]+|/files/[^\\s]+)$") String modelUrl,
    @Size(max = 2048) @Pattern(regexp = "^(https?://[^\\s]+|/files/[^\\s]+)$") String thumbnailUrl
) {}
