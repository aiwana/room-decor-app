package com.roomdecor.service;

import com.roomdecor.dto.ai.AiSuggestionRequest;
import com.roomdecor.dto.ai.AiSuggestionResponse;
import com.roomdecor.dto.ai.ScanRoomResponse;
import com.roomdecor.dto.design.PlacementDto;
import com.roomdecor.dto.floorplan.FloorPlanDto;
import com.roomdecor.entity.RoomImage;
import com.roomdecor.exception.BadRequestException;
import com.roomdecor.exception.ResourceNotFoundException;
import com.roomdecor.mapper.FloorPlanMapper;
import com.roomdecor.repository.FloorPlanRepository;
import com.roomdecor.repository.RoomImageRepository;
import com.roomdecor.service.ai.RoomVisionClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class AiService {

    /** Default canvas scale: 100 pixels per meter */
    private static final int DEFAULT_PIXELS_PER_METER = 100;

    private final RoomImageRepository roomImageRepository;
    private final FloorPlanRepository floorPlanRepository;
    private final FloorPlanService floorPlanService;
    private final RoomVisionClient visionClient;

    public AiService(RoomImageRepository roomImageRepository,
                     FloorPlanRepository floorPlanRepository,
                     FloorPlanService floorPlanService,
                     RoomVisionClient visionClient) {
        this.roomImageRepository = roomImageRepository;
        this.floorPlanRepository = floorPlanRepository;
        this.floorPlanService = floorPlanService;
        this.visionClient = visionClient;
    }

    /**
     * Scan a room image with the AI vision client and create a 2D floor plan.
     * If a floor plan already exists for this image, it is regenerated.
     */
    public ScanRoomResponse scanRoom(UUID roomImageId, UUID userId) {
        RoomImage image = roomImageRepository.findById(roomImageId)
            .orElseThrow(() -> new ResourceNotFoundException("Room image not found"));
        if (!image.getUser().getId().equals(userId)) {
            throw new BadRequestException("Access denied to this room image");
        }

        // Delete existing floor plan for this image (re-scan replaces it).
        // Flush so the DELETE runs before the INSERT below (room_image_id is UNIQUE).
        floorPlanRepository.findByRoomImageId(roomImageId).ifPresent(existing -> {
            floorPlanRepository.delete(existing);
            floorPlanRepository.flush();
        });

        // Call AI vision provider
        RoomVisionClient.RoomAnalysisResult result = visionClient.analyze(image.getUrl());

        // Persist the floor plan
        var fp = floorPlanService.createFromScan(image, result, DEFAULT_PIXELS_PER_METER);
        FloorPlanDto dto = FloorPlanMapper.toDto(fp);

        return new ScanRoomResponse(dto, result.description());
    }

    public AiSuggestionResponse suggestLayout(AiSuggestionRequest request) {
        RoomImage image = roomImageRepository.findById(request.roomImageId())
            .orElseThrow(() -> new ResourceNotFoundException("Room image not found"));

        // Placeholder: layout suggestion logic would use the floor plan + furniture catalog
        List<PlacementDto> placements = List.of();
        String description = "AI layout suggestion for room image: " + image.getId();

        return new AiSuggestionResponse(placements, description);
    }

    public String describeRoom(UUID roomImageId) {
        RoomImage image = roomImageRepository.findById(roomImageId)
            .orElseThrow(() -> new ResourceNotFoundException("Room image not found"));
        return "Room description placeholder for image: " + image.getId();
    }
}
