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
import java.util.ArrayList;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.security.access.AccessDeniedException;

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
            throw new AccessDeniedException("Access denied to this design");
        }
        return DesignMapper.toDto(design);
    }

    public DesignDto create(CreateDesignRequest request, UUID userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        RoomImage roomImage = null;
        if (request.roomImageId() != null) {
            roomImage = roomImageRepository.findById(request.roomImageId())
                .orElseThrow(() -> new ResourceNotFoundException("Room image not found"));
            if (!roomImage.getUser().getId().equals(userId)) {
                throw new AccessDeniedException("Access denied to this room image");
            }
        }
        validateScene(request.sceneJson());

        Design design = Design.builder()
            .user(user)
            .name(request.name().trim())
            .roomImage(roomImage)
            .sceneJson(request.sceneJson() == null || request.sceneJson().isNull() ? null : request.sceneJson())
            .previewImageUrl(request.previewImageUrl())
            .build();

        replacePlacements(design, request.placements());
        design = designRepository.saveAndFlush(design);
        return DesignMapper.toDto(design);
    }

    /**
     * Update a design's name and replace its furniture placements.
     */
    public DesignDto update(UUID id, UpdateDesignRequest request, UUID userId) {
        Design design = designRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Design not found"));
        if (!design.getUser().getId().equals(userId)) {
            throw new AccessDeniedException("Access denied to this design");
        }

        if (request.name() != null && !request.name().isBlank()) {
            design.setName(request.name().trim());
        }

        validateScene(request.sceneJson());
        if (request.sceneJson() != null && !request.sceneJson().isNull()) {
            design.setSceneJson(request.sceneJson());
        }
        if (request.previewImageUrl() != null) {
            design.setPreviewImageUrl(request.previewImageUrl());
        }
        replacePlacements(design, request.placements());

        return DesignMapper.toDto(designRepository.saveAndFlush(design));
    }

    public void delete(UUID id, UUID userId) {
        Design design = designRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Design not found"));
        if (!design.getUser().getId().equals(userId)) {
            throw new AccessDeniedException("Access denied to this design");
        }
        designRepository.delete(design);
    }

    private void validateScene(JsonNode scene) {
        if (scene != null && !scene.isNull() && !scene.isObject()) {
            throw new BadRequestException("sceneJson must be a JSON object");
        }
    }

    private void replacePlacements(Design design, List<PlacementDto> placements) {
        if (placements == null) return;
        List<FurniturePlacement> replacements = new ArrayList<>();
        for (PlacementDto p : placements) {
            if (p == null || p.furnitureId() == null || !finite(p.x()) || !finite(p.y())
                || !finite(p.rotation()) || !finite(p.scale()) || p.scale() <= 0) {
                throw new BadRequestException("Invalid furniture placement");
            }
            Furniture furniture = furnitureRepository.findById(p.furnitureId())
                .orElseThrow(() -> new ResourceNotFoundException("Furniture not found: " + p.furnitureId()));
            replacements.add(FurniturePlacement.builder()
                .design(design).furniture(furniture).x(p.x()).y(p.y())
                .rotation(p.rotation()).scale(p.scale()).build());
        }
        design.getPlacements().clear();
        design.getPlacements().addAll(replacements);
    }

    private boolean finite(Double value) {
        return value != null && Double.isFinite(value);
    }
}
