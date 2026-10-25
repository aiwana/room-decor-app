package com.roomdecor.entity;

/**
 * A wall segment in 2D floor plan coordinates (meters, top-down view).
 * Stored inside FloorPlan.walls as a JSON array (not @Embeddable: Hibernate would then
 * map it as an embedded aggregate and fail to save the list).
 */
public record WallSegment(
    double x1,
    double y1,
    double x2,
    double y2
) {}
