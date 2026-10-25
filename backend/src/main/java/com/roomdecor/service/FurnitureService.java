package com.roomdecor.service;

import com.roomdecor.dto.furniture.FurnitureDto;
import com.roomdecor.entity.Furniture;
import com.roomdecor.exception.ResourceNotFoundException;
import com.roomdecor.mapper.FurnitureMapper;
import com.roomdecor.repository.FurnitureRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class FurnitureService {

    private final FurnitureRepository furnitureRepository;

    public FurnitureService(FurnitureRepository furnitureRepository) {
        this.furnitureRepository = furnitureRepository;
    }

    public List<FurnitureDto> getAll(String category) {
        List<Furniture> items = (category != null && !category.isBlank())
            ? furnitureRepository.findByCategory(category)
            : furnitureRepository.findAll();
        return items.stream().map(FurnitureMapper::toDto).toList();
    }

    public FurnitureDto getById(UUID id) {
        Furniture furniture = furnitureRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Furniture not found"));
        return FurnitureMapper.toDto(furniture);
    }

    public List<FurnitureDto> search(String query) {
        return furnitureRepository.findByNameContainingIgnoreCase(query).stream()
            .map(FurnitureMapper::toDto)
            .toList();
    }
}
