package com.roomdecor.mapper;

import com.roomdecor.dto.floorplan.FloorPlanDto;
import com.roomdecor.dto.floorplan.WallDto;
import com.roomdecor.entity.FloorPlan;
import com.roomdecor.entity.WallSegment;

import java.util.List;

public final class FloorPlanMapper {
    private FloorPlanMapper() {}

    public static FloorPlanDto toDto(FloorPlan fp) {
        List<WallDto> walls = fp.getWalls() == null ? List.of()
            : fp.getWalls().stream().map(FloorPlanMapper::toWallDto).toList();

        return new FloorPlanDto(
            fp.getId(),
            fp.getRoomImage().getId(),
            fp.getRoomWidth(),
            fp.getRoomDepth(),
            fp.getCeilingHeight(),
            walls,
            fp.getPixelsPerMeter(),
            fp.getDescription(),
            fp.getCreatedAt(),
            fp.getUpdatedAt()
        );
    }

    public static WallDto toWallDto(WallSegment w) {
        return new WallDto(w.x1(), w.y1(), w.x2(), w.y2());
    }

    public static WallSegment toWallEntity(WallDto w) {
        return new WallSegment(w.x1(), w.y1(), w.x2(), w.y2());
    }
}
