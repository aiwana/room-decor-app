package com.roomdecor.mapper;

import com.roomdecor.dto.design.DesignDto;
import com.roomdecor.dto.design.PlacementDto;
import com.roomdecor.entity.Design;
import com.roomdecor.entity.FurniturePlacement;

import java.util.List;

public final class DesignMapper {
    private DesignMapper() {}

    public static DesignDto toDto(Design d) {
        List<PlacementDto> placements = d.getPlacements().stream()
            .map(DesignMapper::toPlacementDto)
            .toList();

        return new DesignDto(
            d.getId(),
            d.getName(),
            d.getRoomImage() != null ? d.getRoomImage().getId() : null,
            placements,
            d.getCreatedAt(),
            d.getUpdatedAt()
        );
    }

    public static PlacementDto toPlacementDto(FurniturePlacement p) {
        return new PlacementDto(
            p.getId(),
            p.getFurniture().getId(),
            p.getX(),
            p.getY(),
            p.getRotation(),
            p.getScale()
        );
    }
}
