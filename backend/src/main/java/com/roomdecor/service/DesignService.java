package com.roomdecor.service;

import com.roomdecor.dto.design.*;
import com.roomdecor.entity.*;
import com.roomdecor.exception.BadRequestException;
import com.roomdecor.exception.ResourceNotFoundException;
import com.roomdecor.mapper.DesignMapper;
import com.roomdecor.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class DesignService {

    private final DesignRepository designRepository;
    private final UserRepository userRepository;
    private final RoomImageRepository roomImageRepository;
    private final FurnitureRepository furnitureRepository;

    public DesignService(DesignRepository designRepository, UserRepository userRepository,
                         RoomImageRepository roomImageRepository,
                         FurnitureRepository furnitureRepository) {
        this.designRepository = designRepository;
        this.userRepository = userRepository;
        this.roomImageRepository = roomImageRepository;
        this.furnitureRepository = furnitureRepository;
    }

    public List<DesignDto> getByUserId(UUID userId) {
        return designRepository.findByUserId(userId).stream()
            .map(DesignMapper::toDto)
            .toList();
    }

    public DesignDto getById(UUID id, UUID userId) {
        Design design = designRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Design not found"));
        if (!design.getUser().getId().equals(userId)) {
            throw new BadRequestException("Access denied to this design");
        }
        return DesignMapper.toDto(design);
    }

    public DesignDto create(CreateDesignRequest request, UUID userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        RoomImage roomImage = roomImageRepository.findById(request.roomImageId())
            .orElseThrow(() -> new ResourceNotFoundException("Room image not found"));

        Design design = Design.builder()
            .user(user)
            .name(request.name())
            .roomImage(roomImage)
            .build();

        design = designRepository.save(design);
        return DesignMapper.toDto(design);
    }

    /**
     * Update a design's name and replace its furniture placements.
     */
    public DesignDto update(UUID id, UpdateDesignRequest request, UUID userId) {
        Design design = designRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Design not found"));
        if (!design.getUser().getId().equals(userId)) {
            throw new BadRequestException("Access denied to this design");
        }

        if (request.name() != null && !request.name().isBlank()) {
            design.setName(request.name());
        }
        if (request.floorMaterial() != null && !request.floorMaterial().isBlank()) {
            design.setFloorMaterial(request.floorMaterial());
        }
        if (request.wallMaterial() != null && !request.wallMaterial().isBlank()) {
            design.setWallMaterial(request.wallMaterial());
        }
        if (request.skirtingMaterial() != null && !request.skirtingMaterial().isBlank()) {
            design.setSkirtingMaterial(request.skirtingMaterial());
        }

        if (request.placements() != null) {
            // Clear existing placements and add the new set
            design.getPlacements().clear();
            for (PlacementDto p : request.placements()) {
                Furniture furniture = furnitureRepository.findById(p.furnitureId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                        "Furniture not found: " + p.furnitureId()));

                FurniturePlacement placement = FurniturePlacement.builder()
                    .design(design)
                    .furniture(furniture)
                    .x(p.x())
                    .y(p.y())
                    .rotation(p.rotation())
                    .scale(p.scale())
                    .build();
                design.getPlacements().add(placement);
            }
        }

        return DesignMapper.toDto(design);
    }

    public void delete(UUID id, UUID userId) {
        Design design = designRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Design not found"));
        if (!design.getUser().getId().equals(userId)) {
            throw new BadRequestException("Access denied to this design");
        }
        designRepository.delete(design);
    }
}
