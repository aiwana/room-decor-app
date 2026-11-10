package com.roomdecor.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "room_images")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class RoomImage {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String url;

    @Column(nullable = false)
    private Integer width;

    @Column(nullable = false)
    private Integer height;

    @Column(name = "captured_at", nullable = false)
    private Instant capturedAt;

    /** "photo" = uploaded photo; "blank" = empty/template room drawn by the user, no image file */
    @Column(nullable = false, length = 20)
    @Builder.Default
    private String source = SOURCE_PHOTO;

    public static final String SOURCE_PHOTO = "photo";
    public static final String SOURCE_BLANK = "blank";

    public boolean isBlank() {
        return SOURCE_BLANK.equals(source);
    }
}
