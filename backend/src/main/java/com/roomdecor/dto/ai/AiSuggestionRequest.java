package com.roomdecor.dto.ai;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

/**
 * Ask AI where to put furniture in a scanned room.
 *
 * @param mode  "rearrange" (default) = move the furniture in {@code items};
 *              "add" = keep {@code items} where they are and add a few pieces from the catalog
 * @param style preferred style, e.g. "hiện đại" (optional)
 * @param note  free wish from the user, e.g. "chừa chỗ đi lại rộng" (optional)
 * @param items furniture currently in the room (positions as 0..1 of room width/depth, like placements)
 */
public record AiSuggestionRequest(
    @NotNull UUID roomImageId,
    @Pattern(regexp = "rearrange|add", message = "mode must be 'rearrange' or 'add'") String mode,
    @Size(max = 50) String style,
    @Size(max = 300) String note,
    @Valid @Size(max = 40) List<LayoutItemDto> items
) {}
