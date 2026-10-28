package com.roomdecor.mapper;

import com.roomdecor.dto.furniture.FurnitureDto;
import com.roomdecor.entity.Furniture;
import com.roomdecor.entity.Vendor;

public final class FurnitureMapper {
    private FurnitureMapper() {}

    public static FurnitureDto toDto(Furniture f) {
        Vendor vendor = f.getVendor();
        return new FurnitureDto(
            f.getId(),
            f.getName(),
            f.getCategory(),
            f.getWidth(),
            f.getHeight(),
            f.getDepth(),
            f.getModelUrl(),
            f.getThumbnailUrl(),
            vendor != null ? vendor.getId() : null,
            vendor != null ? vendor.getName() : null,
            f.getPrice(),
            f.getCurrency(),
            f.getStyle(),
            f.getMaterial(),
            f.getStockStatus()
        );
    }
}
