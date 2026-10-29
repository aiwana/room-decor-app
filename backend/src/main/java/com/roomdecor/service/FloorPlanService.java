package com.roomdecor.service;

import com.roomdecor.dto.floorplan.FloorPlanDto;
import com.roomdecor.dto.floorplan.UpdateFloorPlanRequest;
import com.roomdecor.entity.FloorPlan;
import com.roomdecor.entity.Opening;
import com.roomdecor.entity.RoomImage;
import com.roomdecor.entity.WallSegment;
import com.roomdecor.exception.BadRequestException;
import com.roomdecor.exception.ResourceNotFoundException;
import com.roomdecor.mapper.FloorPlanMapper;
import com.roomdecor.repository.FloorPlanRepository;
import com.roomdecor.service.ai.RoomVisionClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
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
     * saveAndFlush so createdAt/updatedAt are filled in before the entity is mapped to a DTO.
     */
    public FloorPlan createFromScan(RoomImage roomImage,
                                    List<UUID> extraImageIds,
                                    RoomVisionClient.RoomAnalysisResult result,
                                    int pixelsPerMeter) {
        FloorPlan fp = FloorPlan.builder()
            .roomImage(roomImage)
            .extraImageIds(new ArrayList<>(extraImageIds))
            .roomWidth(result.roomWidthMeters())
            .roomDepth(result.roomDepthMeters())
            .ceilingHeight(result.ceilingHeightMeters())
            .walls(result.walls())
            .openings(new ArrayList<>(result.openings()))
            .pixelsPerMeter(pixelsPerMeter)
            .description(result.description())
            .build();

        return floorPlanRepository.saveAndFlush(fp);
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
        if (request.openings() != null) {
            List<Opening> openings = request.openings().stream()
                .map(FloorPlanMapper::toOpeningEntity)
                .toList();
            for (Opening o : openings) {
                if (!Opening.DOOR.equals(o.type()) && !Opening.WINDOW.equals(o.type())) {
                    throw new BadRequestException("Opening type must be 'door' or 'window'");
                }
            }
            fp.setOpenings(new ArrayList<>(openings));
        }

        // Flush so updatedAt reflects this change in the response
        return FloorPlanMapper.toDto(floorPlanRepository.saveAndFlush(fp));
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
        return new RoomVisionClient.RoomAnalysisResult(w, d, h, walls, List.of(), desc);
    }
}
