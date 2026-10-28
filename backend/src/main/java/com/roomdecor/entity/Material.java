package com.roomdecor.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "materials")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Material {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "vendor_id")
    private Vendor vendor;

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(nullable = false, length = 200)
    private String name;

    /** floor | wall | skirting */
    @Column(nullable = false, length = 20)
    private String kind;

    @Column(length = 50)
    private String style;

    @Column(name = "color_hex", length = 9)
    private String colorHex;

    @Column(name = "tile_width_cm", precision = 6, scale = 1)
    private BigDecimal tileWidthCm;

    @Column(name = "tile_height_cm", precision = 6, scale = 1)
    private BigDecimal tileHeightCm;

    @Column(precision = 14, scale = 2)
    private BigDecimal price;

    /** m2 | md | piece */
    @Column(name = "price_unit", nullable = false, length = 20)
    private String priceUnit;

    @Column(name = "coverage_m2_per_box", precision = 6, scale = 2)
    private BigDecimal coverageM2PerBox;

    @Column(name = "texture_url")
    private String textureUrl;

    @Column(name = "texture_license", length = 50)
    private String textureLicense;

    @Column(name = "source_url")
    private String sourceUrl;

    @Column(name = "is_sample", nullable = false)
    @Builder.Default
    private boolean sample = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
