package com.roomdecor.dto.ai;

import com.roomdecor.dto.furniture.FurnitureDto;

import java.util.List;

/**
 * @param placements   the whole layout (existing pieces + new ones in "add" mode)
 * @param newFurniture catalog pieces that were added, so the app can show them
 * @param description  short explanation in Vietnamese
 * @param source       "ai" (Gemini) or "rules" (no API key / AI unavailable)
 */
public record AiSuggestionResponse(
    List<SuggestedPlacementDto> placements,
    List<FurnitureDto> newFurniture,
    String description,
    String source
) {}
