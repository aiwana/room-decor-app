package com.roomdecor.controller;

import com.roomdecor.dto.furniture.FurnitureDto;
import com.roomdecor.dto.furniture.FurnitureRequest;
import com.roomdecor.service.FurnitureService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Catalog management for ADMIN. Reading the catalog stays on /api/furniture for every logged-in user.
 * /api/admin/** is also restricted to ADMIN in SecurityConfig; @PreAuthorize is a second guard.
 */
@RestController
@RequestMapping("/api/admin/furniture")
@Tag(name = "Admin", description = "ADMIN role only")
@PreAuthorize("hasRole('ADMIN')")
public class AdminFurnitureController {

    private final FurnitureService furnitureService;

    public AdminFurnitureController(FurnitureService furnitureService) {
        this.furnitureService = furnitureService;
    }

    @Operation(summary = "Add a furniture item to the catalog (ADMIN only)")
    @PostMapping
    public ResponseEntity<FurnitureDto> create(@Valid @RequestBody FurnitureRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(furnitureService.create(request));
    }

    @Operation(summary = "Update a furniture item (ADMIN only)")
    @PutMapping("/{id}")
    public ResponseEntity<FurnitureDto> update(@PathVariable UUID id,
                                               @Valid @RequestBody FurnitureRequest request) {
        return ResponseEntity.ok(furnitureService.update(id, request));
    }

    @Operation(summary = "Delete a furniture item; 409 if a saved design still uses it (ADMIN only)")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        furnitureService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
