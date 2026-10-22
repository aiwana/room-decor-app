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

    public DesignService(DesignRepository designRepository, UserRepository userRepository,
                         RoomImageRepository roomImageRepository) {
        this.designRepository = designRepository;
        this.userRepository = userRepository;
        this.roomImageRepository = roomImageRepository;
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

    public void delete(UUID id, UUID userId) {
        Design design = designRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Design not found"));
        if (!design.getUser().getId().equals(userId)) {
            throw new BadRequestException("Access denied to this design");
        }
        designRepository.delete(design);
    }
}
