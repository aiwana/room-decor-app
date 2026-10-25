package com.roomdecor.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * 2D floor plan generated from a room image AI scan.
 * Coordinates are in meters, top-down view (x = width, y = depth).
 */
@Entity
@Table(name = "floor_plans")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class FloorPlan {

    @Id
    @GeneratedValue
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_image_id", nullable = false, unique = true)
    private RoomImage roomImage;

    /** Estimated room width in meters */
    @Column(nullable = false)
    private Double roomWidth;

    /** Estimated room depth in meters */
    @Column(nullable = false)
    private Double roomDepth;

    /** Estimated ceiling height in meters */
    @Column(nullable = false)
    private Double ceilingHeight;

    /**
     * Wall segments as JSON array: [{x1,y1,x2,y2}, ...].
     * Coordinates in meters relative to the floor plan origin (top-left).
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    private List<WallSegment> walls;

    /** Pixel scale: how many pixels represent 1 meter in the 2D canvas */
    @Column(nullable = false)
    private Integer pixelsPerMeter;

    /** AI-generated description of the room */
    @Column(columnDefinition = "TEXT")
    private String description;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
