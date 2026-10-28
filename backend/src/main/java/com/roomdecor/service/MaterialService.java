package com.roomdecor.service;

import com.roomdecor.dto.material.MaterialDto;
import com.roomdecor.entity.Material;
import com.roomdecor.mapper.MaterialMapper;
import com.roomdecor.repository.MaterialRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class MaterialService {

    private final MaterialRepository materialRepository;

    public MaterialService(MaterialRepository materialRepository) {
        this.materialRepository = materialRepository;
    }

    public List<MaterialDto> getAll(String kind) {
        List<Material> items = (kind != null && !kind.isBlank())
            ? materialRepository.findByKindOrderByNameAsc(kind)
            : materialRepository.findAllByOrderByKindAscNameAsc();
        return items.stream().map(MaterialMapper::toDto).toList();
    }
}
