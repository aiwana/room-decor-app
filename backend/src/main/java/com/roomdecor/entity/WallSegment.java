package com.roomdecor.entity;

import jakarta.persistence.Embeddable;

/**
 * A wall segment in 2D floor plan coordinates (meters, top-down view).
 */
@Embeddable
public record WallSegment(
    double x1,
    double y1,
    double x2,
    double y2
) {}
