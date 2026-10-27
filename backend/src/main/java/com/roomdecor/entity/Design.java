package com.roomdecor.entity;

import jakarta.persistence.*;
import com.fasterxml.jackson.databind.JsonNode;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
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

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "scene_json", columnDefinition = "jsonb")
    private JsonNode sceneJson;

    @Column(name = "preview_image_url", length = 2048)
    private String previewImageUrl;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_image_id")
    private RoomImage roomImage;

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
