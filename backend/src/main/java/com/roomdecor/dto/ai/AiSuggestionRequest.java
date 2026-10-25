package com.roomdecor.dto.ai;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record AiSuggestionRequest(
    @NotNull UUID roomImageId,
    String style
) {}
