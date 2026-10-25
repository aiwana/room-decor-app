package com.roomdecor.dto.ai;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record ScanRoomRequest(
    @NotNull UUID roomImageId
) {}
