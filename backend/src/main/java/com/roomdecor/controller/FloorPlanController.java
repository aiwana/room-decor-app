package com.roomdecor.controller;

import com.roomdecor.dto.floorplan.FloorPlanDto;
import com.roomdecor.dto.floorplan.UpdateFloorPlanRequest;
import com.roomdecor.service.FloorPlanService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/floor-plans")
public class FloorPlanController {

    private final FloorPlanService floorPlanService;

    public FloorPlanController(FloorPlanService floorPlanService) {
        this.floorPlanService = floorPlanService;
    }

    @GetMapping("/{id}")
    public ResponseEntity<FloorPlanDto> getById(@PathVariable UUID id, Authentication auth) {
        UUID userId = (UUID) auth.getPrincipal();
        return ResponseEntity.ok(floorPlanService.getById(id, userId));
    }

    @GetMapping("/by-room-image/{roomImageId}")
    public ResponseEntity<FloorPlanDto> getByRoomImageId(@PathVariable UUID roomImageId, Authentication auth) {
        UUID userId = (UUID) auth.getPrincipal();
        return ResponseEntity.ok(floorPlanService.getByRoomImageId(roomImageId, userId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<FloorPlanDto> update(
        @PathVariable UUID id,
        @Valid @RequestBody UpdateFloorPlanRequest request,
        Authentication auth
    ) {
        UUID userId = (UUID) auth.getPrincipal();
        return ResponseEntity.ok(floorPlanService.update(id, request, userId));
    }
}
