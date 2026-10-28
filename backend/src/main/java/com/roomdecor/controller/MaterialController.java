package com.roomdecor.controller;

import com.roomdecor.dto.material.MaterialDto;
import com.roomdecor.service.MaterialService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/materials")
public class MaterialController {

    private final MaterialService materialService;

    public MaterialController(MaterialService materialService) {
        this.materialService = materialService;
    }

    @GetMapping
    public ResponseEntity<List<MaterialDto>> getAll(@RequestParam(required = false) String kind) {
        return ResponseEntity.ok(materialService.getAll(kind));
    }
}
