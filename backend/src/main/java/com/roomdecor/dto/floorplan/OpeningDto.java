package com.roomdecor.dto.floorplan;

/** Door or window on a wall: type is "door" or "window", coordinates in meters. */
public record OpeningDto(
    String type,
    double x1,
    double y1,
    double x2,
    double y2
) {}
