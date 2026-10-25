package com.roomdecor.dto.ai;

import com.roomdecor.dto.floorplan.FloorPlanDto;

public record ScanRoomResponse(
    FloorPlanDto floorPlan,
    String description
) {}
