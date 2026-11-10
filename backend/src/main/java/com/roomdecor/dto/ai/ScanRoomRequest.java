package com.roomdecor.dto.ai;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

/**
 * Scan a room with AI.
 *
 * @param roomImageId           main photo (the floor plan is attached to it)
 * @param extraImageIds         optional extra photos of the same room, e.g. one per corner
 * @param referenceLengthMeters optional real length of the wall facing the camera in the main photo (older apps)
 * @param roomLengthMeters      optional measured length of the room (longer side)
 * @param roomWidthMeters       optional measured width of the room (shorter side)
 * @param ceilingHeightMeters   optional measured ceiling height
 */
public record ScanRoomRequest(
    @NotNull UUID roomImageId,
    @Size(max = 5) List<UUID> extraImageIds,
    @DecimalMin("0.5") @DecimalMax("30.0") Double referenceLengthMeters,
    @DecimalMin("0.5") @DecimalMax("30.0") Double roomLengthMeters,
    @DecimalMin("0.5") @DecimalMax("30.0") Double roomWidthMeters,
    @DecimalMin("1.8") @DecimalMax("6.0") Double ceilingHeightMeters
) {
    public ScanRoomRequest(UUID roomImageId, List<UUID> extraImageIds, Double referenceLengthMeters) {
        this(roomImageId, extraImageIds, referenceLengthMeters, null, null, null);
    }
}
