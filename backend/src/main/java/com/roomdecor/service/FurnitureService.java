package com.roomdecor.service;

import com.roomdecor.dto.furniture.FurnitureDto;
import com.roomdecor.dto.furniture.FurnitureRequest;
import com.roomdecor.entity.Furniture;
import com.roomdecor.exception.ConflictException;
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

    // ----- ADMIN catalog management (called from AdminFurnitureController) -----

    @Transactional
    public FurnitureDto create(FurnitureRequest request) {
        Furniture furniture = new Furniture();
        apply(furniture, request);
        return FurnitureMapper.toDto(furnitureRepository.save(furniture));
    }

    @Transactional
    public FurnitureDto update(UUID id, FurnitureRequest request) {
        Furniture furniture = furnitureRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Furniture not found"));
        apply(furniture, request);
        return FurnitureMapper.toDto(furnitureRepository.save(furniture));
    }

    @Transactional
    public void delete(UUID id) {
        if (!furnitureRepository.existsById(id)) {
            throw new ResourceNotFoundException("Furniture not found");
        }
        // Deleting would break saved designs (and the FK would reject it), so refuse clearly
        if (furnitureRepository.isUsedInDesigns(id)) {
            throw new ConflictException("Furniture is used in saved designs and cannot be deleted");
        }
        furnitureRepository.deleteById(id);
    }

    private static void apply(Furniture f, FurnitureRequest r) {
        f.setName(r.name().trim());
        f.setCategory(r.category().trim());
        f.setWidth(r.width());
        f.setHeight(r.height());
        f.setDepth(r.depth());
        f.setModelUrl(blankToNull(r.modelUrl()));
        f.setThumbnailUrl(blankToNull(r.thumbnailUrl()));
        f.setPrice(r.price());
        f.setCurrency(r.currency() == null || r.currency().isBlank() ? "VND" : r.currency().trim());
        f.setStyle(blankToNull(r.style()));
        f.setMaterial(blankToNull(r.material()));
        f.setStockStatus(r.stockStatus() == null || r.stockStatus().isBlank() ? "in_stock" : r.stockStatus());
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
