package com.roomdecor.mapper;

import com.roomdecor.dto.furniture.FurnitureDto;
import com.roomdecor.entity.Furniture;

public final class FurnitureMapper {
    private FurnitureMapper() {}

    public static FurnitureDto toDto(Furniture f) {
        return new FurnitureDto(
            f.getId(),
            f.getName(),
            f.getCategory(),
            f.getWidth(),
            f.getHeight(),
            f.getDepth(),
            f.getModelUrl(),
            f.getThumbnailUrl()
        );
    }
}
