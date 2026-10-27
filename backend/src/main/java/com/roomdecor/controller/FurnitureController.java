package com.roomdecor.controller;

import com.roomdecor.dto.furniture.FurnitureDto;
import com.roomdecor.dto.furniture.FurnitureRequest;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.http.HttpStatus;
import com.roomdecor.service.FurnitureService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/furniture")
public class FurnitureController {

    private final FurnitureService furnitureService;

    public FurnitureController(FurnitureService furnitureService) {
        this.furnitureService = furnitureService;
    }

    @GetMapping
    public ResponseEntity<List<FurnitureDto>> getAll(@RequestParam(required = false) String category) {
        return ResponseEntity.ok(furnitureService.getAll(category));
    }

    @GetMapping("/{id}")
    public ResponseEntity<FurnitureDto> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(furnitureService.getById(id));
    }

    @GetMapping("/search")
    public ResponseEntity<List<FurnitureDto>> search(@RequestParam String q) {
        return ResponseEntity.ok(furnitureService.search(q));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<FurnitureDto> create(@Valid @RequestBody FurnitureRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(furnitureService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<FurnitureDto> update(@PathVariable UUID id,
                                              @Valid @RequestBody FurnitureRequest request) {
        return ResponseEntity.ok(furnitureService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        furnitureService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
