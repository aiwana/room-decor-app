package com.roomdecor.dto.material;

import java.math.BigDecimal;
import java.util.UUID;

public record MaterialDto(
    UUID id,
    UUID vendorId,
    String vendorName,
    String code,
    String name,
    String kind,
    String style,
    String colorHex,
    BigDecimal tileWidthCm,
    BigDecimal tileHeightCm,
    BigDecimal price,
    String priceUnit,
    BigDecimal coverageM2PerBox,
    String textureUrl,
    String textureLicense,
    String sourceUrl,
    boolean isSample
) {}
