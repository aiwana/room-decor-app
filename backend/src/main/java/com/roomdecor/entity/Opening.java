package com.roomdecor.entity;

/**
 * A door or window lying on a wall of the floor plan (meters, top-down view).
 * (x1,y1) and (x2,y2) are the two ends of the opening along its wall.
 * Stored inside FloorPlan.openings as a JSON array, like {@link WallSegment}.
 */
public record Opening(
    String type,
    double x1,
    double y1,
    double x2,
    double y2
) {
    public static final String DOOR = "door";
    public static final String WINDOW = "window";
}
