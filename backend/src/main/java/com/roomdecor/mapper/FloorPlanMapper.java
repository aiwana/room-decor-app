package com.roomdecor.mapper;

import com.roomdecor.dto.floorplan.FloorPlanDto;
import com.roomdecor.dto.floorplan.OpeningDto;
import com.roomdecor.dto.floorplan.WallDto;
import com.roomdecor.entity.FloorPlan;
import com.roomdecor.entity.Opening;
import com.roomdecor.entity.WallSegment;

import java.util.List;

public final class FloorPlanMapper {
    private FloorPlanMapper() {}

    public static FloorPlanDto toDto(FloorPlan fp) {
        List<WallDto> walls = fp.getWalls() == null ? List.of()
            : fp.getWalls().stream().map(FloorPlanMapper::toWallDto).toList();
        List<OpeningDto> openings = fp.getOpenings() == null ? List.of()
            : fp.getOpenings().stream().map(FloorPlanMapper::toOpeningDto).toList();

        return new FloorPlanDto(
            fp.getId(),
            fp.getRoomImage().getId(),
            fp.getExtraImageIds() == null ? List.of() : List.copyOf(fp.getExtraImageIds()),
            fp.getRoomWidth(),
            fp.getRoomDepth(),
            fp.getCeilingHeight(),
            walls,
            openings,
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

    public static OpeningDto toOpeningDto(Opening o) {
        return new OpeningDto(o.type(), o.x1(), o.y1(), o.x2(), o.y2());
    }

    public static Opening toOpeningEntity(OpeningDto o) {
        return new Opening(o.type(), o.x1(), o.y1(), o.x2(), o.y2());
    }
}
