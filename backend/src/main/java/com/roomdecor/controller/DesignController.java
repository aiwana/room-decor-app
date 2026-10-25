package com.roomdecor.controller;

import com.roomdecor.dto.design.*;
import com.roomdecor.service.DesignService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/designs")
public class DesignController {

    private final DesignService designService;

    public DesignController(DesignService designService) {
        this.designService = designService;
    }

    @GetMapping
    public ResponseEntity<List<DesignDto>> getAll(Authentication auth) {
        UUID userId = (UUID) auth.getPrincipal();
        return ResponseEntity.ok(designService.getByUserId(userId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<DesignDto> getById(@PathVariable UUID id, Authentication auth) {
        UUID userId = (UUID) auth.getPrincipal();
        return ResponseEntity.ok(designService.getById(id, userId));
    }

    @PostMapping
    public ResponseEntity<DesignDto> create(@Valid @RequestBody CreateDesignRequest request, Authentication auth) {
        UUID userId = (UUID) auth.getPrincipal();
        return ResponseEntity.ok(designService.create(request, userId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<DesignDto> update(@PathVariable UUID id, @Valid @RequestBody UpdateDesignRequest request, Authentication auth) {
        UUID userId = (UUID) auth.getPrincipal();
        return ResponseEntity.ok(designService.update(id, request, userId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id, Authentication auth) {
        UUID userId = (UUID) auth.getPrincipal();
        designService.delete(id, userId);
        return ResponseEntity.noContent().build();
    }
}
