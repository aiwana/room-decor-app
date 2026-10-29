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
 * @param referenceLengthMeters optional real length of the wall facing the camera in the main photo
 */
public record ScanRoomRequest(
    @NotNull UUID roomImageId,
    @Size(max = 5) List<UUID> extraImageIds,
    @DecimalMin("0.5") @DecimalMax("30.0") Double referenceLengthMeters
) {}
