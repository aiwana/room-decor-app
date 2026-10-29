package com.roomdecor.service;

import com.roomdecor.dto.ai.AiSuggestionRequest;
import com.roomdecor.dto.ai.AiSuggestionResponse;
import com.roomdecor.dto.ai.ScanRoomRequest;
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
import com.roomdecor.storage.StorageService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
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
    private final StorageService storageService;

    public AiService(RoomImageRepository roomImageRepository,
                     FloorPlanRepository floorPlanRepository,
                     FloorPlanService floorPlanService,
                     RoomVisionClient visionClient,
                     StorageService storageService) {
        this.roomImageRepository = roomImageRepository;
        this.floorPlanRepository = floorPlanRepository;
        this.floorPlanService = floorPlanService;
        this.visionClient = visionClient;
        this.storageService = storageService;
    }

    /** Gemini accepts about 20 MB per request; keep a margin for the prompt and base64 overhead. */
    static final long MAX_TOTAL_IMAGE_BYTES = 14L * 1024 * 1024;

    /**
     * Scan a room with the AI vision client and create a 2D floor plan.
     * The main photo plus optional extra photos (e.g. one per corner) are sent together.
     * If a floor plan already exists for the main photo, it is regenerated.
     */
    public ScanRoomResponse scanRoom(ScanRoomRequest request, UUID userId) {
        RoomImage image = loadOwnedImage(request.roomImageId(), userId);

        // Extra photos: drop duplicates and the main photo itself, keep the user's order
        List<UUID> extraIds = request.extraImageIds() == null ? List.of()
            : request.extraImageIds().stream()
                .filter(Objects::nonNull)
                .filter(id -> !id.equals(image.getId()))
                .distinct()
                .toList();
        List<RoomImage> photos = new ArrayList<>();
        photos.add(image);
        for (UUID id : extraIds) {
            photos.add(loadOwnedImage(id, userId));
        }

        // Read the local uploads and send them inline so localhost/LAN URLs do not need to be public.
        List<RoomVisionClient.ImageInput> inputs = new ArrayList<>();
        long totalBytes = 0;
        for (RoomImage photo : photos) {
            byte[] bytes = storageService.readImageBytes(photo.getUrl());
            totalBytes += bytes.length;
            if (totalBytes > MAX_TOTAL_IMAGE_BYTES) {
                throw new BadRequestException("Room photos are too large in total (max 14 MB), please send smaller photos");
            }
            inputs.add(new RoomVisionClient.ImageInput(photo.getUrl(), bytes, storageService.imageMimeType(photo.getUrl())));
        }

        RoomVisionClient.RoomAnalysisResult result = FloorPlanGeometry.normalize(
            visionClient.analyze(inputs, new RoomVisionClient.ScanHints(request.referenceLengthMeters()))
        );

        // Delete existing floor plan for this image (re-scan replaces it).
        // Flush so the DELETE runs before the INSERT below (room_image_id is UNIQUE).
        // Done after the AI call so a failed scan keeps the old floor plan.
        floorPlanRepository.findByRoomImageId(image.getId()).ifPresent(existing -> {
            floorPlanRepository.delete(existing);
            floorPlanRepository.flush();
        });

        var fp = floorPlanService.createFromScan(image, extraIds, result, DEFAULT_PIXELS_PER_METER);
        FloorPlanDto dto = FloorPlanMapper.toDto(fp);

        return new ScanRoomResponse(dto, result.description());
    }

    private RoomImage loadOwnedImage(UUID roomImageId, UUID userId) {
        RoomImage image = roomImageRepository.findById(roomImageId)
            .orElseThrow(() -> new ResourceNotFoundException("Room image not found"));
        if (!image.getUser().getId().equals(userId)) {
            throw new BadRequestException("Access denied to this room image");
        }
        return image;
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
