package com.roomdecor.dto.design;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;

import java.util.UUID;

public record CreateDesignRequest(
    @NotBlank @Size(max = 200) String name,
    UUID roomImageId,
    JsonNode sceneJson,
    @Size(max = 2048) @Pattern(regexp = "^(https?://[^\\s]+|/files/[^\\s]+)$") String previewImageUrl,
    @Valid List<@NotNull PlacementDto> placements
) {}
