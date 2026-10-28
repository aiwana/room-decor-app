package com.roomdecor.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "designs")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Design {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 200)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_image_id")
    private RoomImage roomImage;

    @Column(name = "floor_material", nullable = false, length = 50)
    @Builder.Default
    private String floorMaterial = "wood";

    @Column(name = "wall_material", nullable = false, length = 50)
    @Builder.Default
    private String wallMaterial = "white";

    @Column(name = "skirting_material", nullable = false, length = 50)
    @Builder.Default
    private String skirtingMaterial = "skirting-10x60";

    @OneToMany(
        mappedBy = "design",
        cascade = CascadeType.ALL,
        orphanRemoval = true
    )
    @Builder.Default
    private List<FurniturePlacement> placements = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
