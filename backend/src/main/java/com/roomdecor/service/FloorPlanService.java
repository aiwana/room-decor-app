package com.roomdecor.service;

import com.roomdecor.dto.floorplan.CreateBlankRoomRequest;
import com.roomdecor.dto.floorplan.FloorPlanDto;
import com.roomdecor.dto.floorplan.UpdateFloorPlanRequest;
import com.roomdecor.entity.FloorPlan;
import com.roomdecor.entity.Opening;
import com.roomdecor.entity.RoomImage;
import com.roomdecor.entity.User;
import com.roomdecor.entity.WallSegment;
import com.roomdecor.exception.BadRequestException;
import com.roomdecor.exception.ResourceNotFoundException;
import com.roomdecor.mapper.FloorPlanMapper;
import com.roomdecor.repository.FloorPlanRepository;
import com.roomdecor.repository.RoomImageRepository;
import com.roomdecor.repository.UserRepository;
import com.roomdecor.service.ai.RoomVisionClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class FloorPlanService {

    static final int DEFAULT_PIXELS_PER_METER = 100;
    static final String BLANK_DESCRIPTION = "Phòng do bạn tự tạo (không quét từ ảnh). Bấm \"Sửa phòng\" để chỉnh tường, cửa đi và cửa sổ.";

    private final FloorPlanRepository floorPlanRepository;
    private final RoomImageRepository roomImageRepository;
    private final UserRepository userRepository;

    public FloorPlanService(FloorPlanRepository floorPlanRepository,
                            RoomImageRepository roomImageRepository,
                            UserRepository userRepository) {
        this.floorPlanRepository = floorPlanRepository;
        this.roomImageRepository = roomImageRepository;
        this.userRepository = userRepository;
    }

    /**
     * Empty or template room, no photo. A "blank" room image row is created so the rest of the app
     * (designs, editor, AI layout suggestion) keeps working with roomImageId as before.
     * The shape is cleaned by FloorPlanGeometry like an AI result: without walls it is a rectangle.
     */
    public FloorPlanDto createBlank(CreateBlankRoomRequest request, UUID userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        List<WallSegment> walls = request.walls() == null ? List.of()
            : request.walls().stream().map(FloorPlanMapper::toWallEntity).toList();
        List<Opening> openings = request.openings() == null ? List.of()
            : request.openings().stream().map(FloorPlanMapper::toOpeningEntity).toList();
        for (Opening o : openings) {
            if (!Opening.DOOR.equals(o.type()) && !Opening.WINDOW.equals(o.type())) {
                throw new BadRequestException("Opening type must be 'door' or 'window'");
            }
        }
        if (!walls.isEmpty() && walls.size() < 3) {
            throw new BadRequestException("A room needs at least 3 walls");
        }

        double ceiling = request.ceilingHeight() == null ? FloorPlanGeometry.DEFAULT_CEILING : request.ceilingHeight();
        String description = request.description() == null || request.description().isBlank()
            ? BLANK_DESCRIPTION : request.description();
        RoomVisionClient.RoomAnalysisResult shape = FloorPlanGeometry.normalize(new RoomVisionClient.RoomAnalysisResult(
            request.roomWidth(), request.roomDepth(), ceiling, walls, openings, description));

        RoomImage image = roomImageRepository.save(RoomImage.builder()
            .user(user)
            .url(RoomImage.SOURCE_BLANK)
            .width(0)
            .height(0)
            .capturedAt(Instant.now())
            .source(RoomImage.SOURCE_BLANK)
            .build());

        FloorPlan fp = createFromScan(image, List.of(), shape, DEFAULT_PIXELS_PER_METER);
        return FloorPlanMapper.toDto(fp);
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
