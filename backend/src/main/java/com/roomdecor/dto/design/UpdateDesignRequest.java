package com.roomdecor.dto.design;

import java.util.List;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

/**
 * Request to update a design's name and/or furniture placements.
 */
public record UpdateDesignRequest(
    @Size(max = 200) @Pattern(regexp = "(?s).*\\S.*", message = "must not be blank") String name,
    @Valid List<@NotNull PlacementDto> placements,
    JsonNode sceneJson,
    @Size(max = 2048) @Pattern(regexp = "^(https?://[^\\s]+|/files/[^\\s]+)$") String previewImageUrl
) {}
