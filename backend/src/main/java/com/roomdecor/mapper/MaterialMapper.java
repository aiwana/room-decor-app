package com.roomdecor.mapper;

import com.roomdecor.dto.material.MaterialDto;
import com.roomdecor.entity.Material;
import com.roomdecor.entity.Vendor;

public final class MaterialMapper {
    private MaterialMapper() {}

    public static MaterialDto toDto(Material m) {
        Vendor vendor = m.getVendor();
        return new MaterialDto(
            m.getId(),
            vendor != null ? vendor.getId() : null,
            vendor != null ? vendor.getName() : null,
            m.getCode(),
            m.getName(),
            m.getKind(),
            m.getStyle(),
            m.getColorHex(),
            m.getTileWidthCm(),
            m.getTileHeightCm(),
            m.getPrice(),
            m.getPriceUnit(),
            m.getCoverageM2PerBox(),
            m.getTextureUrl(),
            m.getTextureLicense(),
            m.getSourceUrl(),
            m.isSample()
        );
    }
}
