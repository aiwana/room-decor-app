package com.roomdecor.service;

import com.roomdecor.dto.floorplan.FloorPlanDto;
import com.roomdecor.dto.floorplan.UpdateFloorPlanRequest;
import com.roomdecor.entity.FloorPlan;
import com.roomdecor.entity.RoomImage;
import com.roomdecor.entity.WallSegment;
import com.roomdecor.exception.BadRequestException;
import com.roomdecor.exception.ResourceNotFoundException;
import com.roomdecor.mapper.FloorPlanMapper;
import com.roomdecor.repository.FloorPlanRepository;
import com.roomdecor.service.ai.RoomVisionClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class FloorPlanService {

    private final FloorPlanRepository floorPlanRepository;

    public FloorPlanService(FloorPlanRepository floorPlanRepository) {
        this.floorPlanRepository = floorPlanRepository;
    }

    @Transactional(readOnly = true)
    public FloorPlanDto getByRoomImageId(UUID roomImageId, UUID userId) {
        FloorPlan fp = floorPlanRepository.findByRoomImageId(roomImageId)
            .orElseThrow(() -> new ResourceNotFoundException("Floor plan not found for this room image"));
        assertOwnership(fp, userId);
        return FloorPlanMapper.toDto(fp);
    }

    @Transactional(readOnly = true)
    public FloorPlanDto getById(UUID id, UUID userId) {
        FloorPlan fp = floorPlanRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Floor plan not found"));
        assertOwnership(fp, userId);
        return FloorPlanMapper.toDto(fp);
    }

    /**
     * Create a floor plan from an AI analysis result.
     */
    public FloorPlan createFromScan(RoomImage roomImage,
                                    RoomVisionClient.RoomAnalysisResult result,
                                    int pixelsPerMeter) {
        List<WallSegment> walls = result.walls();

        FloorPlan fp = FloorPlan.builder()
            .roomImage(roomImage)
            .roomWidth(result.roomWidthMeters())
            .roomDepth(result.roomDepthMeters())
            .ceilingHeight(result.ceilingHeightMeters())
            .walls(walls)
            .pixelsPerMeter(pixelsPerMeter)
            .description(result.description())
            .build();

        return floorPlanRepository.save(fp);
    }

    /**
     * Update a floor plan with user corrections (edited walls/dimensions).
     */
    public FloorPlanDto update(UUID id, UpdateFloorPlanRequest request, UUID userId) {
        FloorPlan fp = floorPlanRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Floor plan not found"));
        assertOwnership(fp, userId);

        if (request.roomWidth() != null) fp.setRoomWidth(request.roomWidth());
        if (request.roomDepth() != null) fp.setRoomDepth(request.roomDepth());
        if (request.ceilingHeight() != null) fp.setCeilingHeight(request.ceilingHeight());
        if (request.pixelsPerMeter() != null) fp.setPixelsPerMeter(request.pixelsPerMeter());
        if (request.walls() != null) {
            List<WallSegment> walls = request.walls().stream()
                .map(FloorPlanMapper::toWallEntity)
                .toList();
            fp.setWalls(walls);
        }

        return FloorPlanMapper.toDto(fp);
    }

    private void assertOwnership(FloorPlan fp, UUID userId) {
        if (!fp.getRoomImage().getUser().getId().equals(userId)) {
            throw new BadRequestException("Access denied to this floor plan");
        }
    }

    // Re-export type for AiService convenience
    public RoomVisionClient.RoomAnalysisResult scanResult(
        double w, double d, double h, List<WallSegment> walls, String desc
    ) {
        return new RoomVisionClient.RoomAnalysisResult(w, d, h, walls, desc);
    }
}
