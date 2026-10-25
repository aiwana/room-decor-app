package com.roomdecor.dto.ai;

import com.roomdecor.dto.design.PlacementDto;

import java.util.List;

public record AiSuggestionResponse(
    List<PlacementDto> placements,
    String description
) {}
