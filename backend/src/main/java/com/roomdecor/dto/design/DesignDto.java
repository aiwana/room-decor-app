package com.roomdecor.dto.design;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import com.fasterxml.jackson.databind.JsonNode;

public record DesignDto(
    UUID id,
    String name,
    UUID roomImageId,
    List<PlacementDto> placements,
    Instant createdAt,
    Instant updatedAt,
    JsonNode sceneJson,
    String previewImageUrl
) {}
