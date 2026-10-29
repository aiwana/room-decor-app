package com.roomdecor.service;

import com.roomdecor.dto.ai.AiSuggestionRequest;
import com.roomdecor.dto.ai.AiSuggestionResponse;
import com.roomdecor.dto.ai.LayoutItemDto;
import com.roomdecor.dto.ai.SuggestedPlacementDto;
import com.roomdecor.dto.ai.ScanRoomRequest;
import com.roomdecor.dto.ai.ScanRoomResponse;
import com.roomdecor.dto.furniture.FurnitureDto;
import com.roomdecor.entity.FloorPlan;
import com.roomdecor.entity.Furniture;
import com.roomdecor.dto.floorplan.FloorPlanDto;
import com.roomdecor.entity.RoomImage;
import com.roomdecor.exception.BadRequestException;
import com.roomdecor.exception.ResourceNotFoundException;
import com.roomdecor.mapper.FloorPlanMapper;
import com.roomdecor.mapper.FurnitureMapper;
import com.roomdecor.repository.FloorPlanRepository;
import com.roomdecor.repository.FurnitureRepository;
import com.roomdecor.repository.RoomImageRepository;
import com.roomdecor.service.ai.LayoutAdvisor;
import com.roomdecor.service.ai.RoomVisionClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import com.roomdecor.storage.StorageService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
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
    private final FurnitureRepository furnitureRepository;
    private final LayoutAdvisor layoutAdvisor;
    private final LayoutAdvisor fallbackAdvisor = new RuleBasedLayoutAdvisor();

    private static final Logger log = LoggerFactory.getLogger(AiService.class);

    /** Catalog pieces sent to the AI in "add" mode (keeps the prompt small) */
    static final int MAX_CATALOG_ITEMS = 60;

    public AiService(RoomImageRepository roomImageRepository,
                     FloorPlanRepository floorPlanRepository,
                     FloorPlanService floorPlanService,
                     RoomVisionClient visionClient,
                     StorageService storageService,
                     FurnitureRepository furnitureRepository,
                     LayoutAdvisor layoutAdvisor) {
        this.roomImageRepository = roomImageRepository;
        this.floorPlanRepository = floorPlanRepository;
        this.floorPlanService = floorPlanService;
        this.visionClient = visionClient;
        this.storageService = storageService;
        this.furnitureRepository = furnitureRepository;
        this.layoutAdvisor = layoutAdvisor;
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

    /**
     * Suggest where to put furniture, from the floor plan only (no photo is sent).
     * "rearrange" moves the pieces in the request; "add" keeps them and adds a few catalog pieces.
     * The AI answer is cleaned by LayoutGeometry; if the AI fails, simple rules are used instead.
     */
    @Transactional(readOnly = true)
    public AiSuggestionResponse suggestLayout(AiSuggestionRequest request, UUID userId) {
        RoomImage image = loadOwnedImage(request.roomImageId(), userId);
        FloorPlan plan = floorPlanRepository.findByRoomImageId(image.getId())
            .orElseThrow(() -> new BadRequestException("Scan the room first, then ask for a layout suggestion"));
        LayoutAdvisor.Mode mode = "add".equals(request.mode()) ? LayoutAdvisor.Mode.ADD : LayoutAdvisor.Mode.REARRANGE;
        double width = plan.getRoomWidth();
        double depth = plan.getRoomDepth();

        // Furniture in the room -> short refs p1, p2... with positions in meters
        List<LayoutItemDto> items = request.items() == null ? List.of() : request.items();
        Map<String, LayoutItemDto> placedByRef = new LinkedHashMap<>();
        List<LayoutAdvisor.Item> placed = new ArrayList<>();
        for (LayoutItemDto it : items) {
            String ref = "p" + (placed.size() + 1);
            placedByRef.put(ref, it);
            placed.add(new LayoutAdvisor.Item(ref, it.name(), it.category(),
                it.width() * scaleOf(it), it.depth() * scaleOf(it), it.height() == null ? 0 : it.height() * scaleOf(it),
                null, null, it.x() * width, it.y() * depth, it.rotation() == null ? 0 : it.rotation()));
        }
        if (mode == LayoutAdvisor.Mode.REARRANGE && placed.isEmpty()) {
            throw new BadRequestException("Add some furniture first, then ask AI to rearrange it");
        }

        // Catalog -> refs c1, c2... (only in "add" mode)
        Map<String, Furniture> catalogByRef = new HashMap<>();
        List<LayoutAdvisor.Item> catalog = new ArrayList<>();
        if (mode == LayoutAdvisor.Mode.ADD) {
            List<Furniture> all = furnitureRepository
                .findAll(PageRequest.of(0, MAX_CATALOG_ITEMS, Sort.by("category", "name"))).getContent();
            for (Furniture f : all) {
                if (f.getWidth() == null || f.getDepth() == null || f.getWidth() <= 0 || f.getDepth() <= 0) continue;
                String ref = "c" + (catalog.size() + 1);
                catalogByRef.put(ref, f);
                catalog.add(new LayoutAdvisor.Item(ref, f.getName(), f.getCategory(), f.getWidth(), f.getDepth(),
                    f.getHeight() == null ? 0 : f.getHeight(), f.getPrice() == null ? null : f.getPrice().doubleValue(),
                    f.getStyle(), null, null, null));
            }
            if (catalog.isEmpty()) {
                throw new BadRequestException("The furniture catalog is empty, nothing to add");
            }
        }

        LayoutAdvisor.LayoutRequest layoutRequest = new LayoutAdvisor.LayoutRequest(mode,
            LayoutGeometry.polygon(plan.getWalls(), width, depth), plan.getOpenings(), plan.getCeilingHeight(),
            placed, catalog, request.style(), request.note());

        LayoutAdvisor.LayoutResult raw;
        String source = layoutAdvisor.usesAi() ? "ai" : "rules";
        try {
            raw = layoutAdvisor.suggest(layoutRequest);
        } catch (RuntimeException e) {
            if (!layoutAdvisor.usesAi()) throw e;
            // AI busy / down: still give the user a sensible layout
            log.warn("AI layout suggestion failed, using rules instead: {}", e.getMessage());
            raw = fallbackAdvisor.suggest(layoutRequest);
            source = "rules";
        }
        List<LayoutAdvisor.ItemPlacement> cleaned = LayoutGeometry.clean(raw, layoutRequest);

        // Back to the app's format: 0..1 of the room size, original ids
        List<SuggestedPlacementDto> placements = new ArrayList<>();
        Map<UUID, FurnitureDto> newFurniture = new LinkedHashMap<>();
        for (LayoutAdvisor.ItemPlacement p : cleaned) {
            double x = clamp01(p.x() / width);
            double y = clamp01(p.y() / depth);
            LayoutItemDto existing = placedByRef.get(p.ref());
            if (existing != null) {
                // "add" mode: current pieces stay exactly where they were (no rounding drift)
                boolean keep = mode == LayoutAdvisor.Mode.ADD;
                placements.add(new SuggestedPlacementDto(existing.placementId(), existing.furnitureId(),
                    keep ? existing.x() : x, keep ? existing.y() : y,
                    keep && existing.rotation() != null ? existing.rotation() : p.rotation(), scaleOf(existing)));
            } else {
                Furniture f = catalogByRef.get(p.ref());
                if (f == null) continue;
                placements.add(new SuggestedPlacementDto("ai-" + UUID.randomUUID(), f.getId().toString(), x, y, p.rotation(), 1));
                newFurniture.putIfAbsent(f.getId(), FurnitureMapper.toDto(f));
            }
        }

        String description = raw.description() == null || raw.description().isBlank()
            ? "Đây là cách bố trí gợi ý cho phòng của bạn."
            : raw.description();
        return new AiSuggestionResponse(placements, List.copyOf(newFurniture.values()), description, source);
    }

    private static double scaleOf(LayoutItemDto item) {
        return item.scale() == null ? 1 : item.scale();
    }

    private static double clamp01(double v) {
        return Math.max(0, Math.min(1, v));
    }

    public String describeRoom(UUID roomImageId) {
        RoomImage image = roomImageRepository.findById(roomImageId)
            .orElseThrow(() -> new ResourceNotFoundException("Room image not found"));
        return "Room description placeholder for image: " + image.getId();
    }
}
