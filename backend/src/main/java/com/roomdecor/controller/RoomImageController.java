package com.roomdecor.controller;

import com.roomdecor.dto.roomimage.RoomImageDto;
import com.roomdecor.mapper.RoomImageMapper;
import com.roomdecor.service.RoomImageService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/room-images")
public class RoomImageController {

    private final RoomImageService roomImageService;

    public RoomImageController(RoomImageService roomImageService) {
        this.roomImageService = roomImageService;
    }

    @PostMapping("/upload")
    public ResponseEntity<RoomImageDto> upload(@RequestParam("file") MultipartFile file, Authentication auth) {
        UUID userId = (UUID) auth.getPrincipal();
        return ResponseEntity.ok(RoomImageMapper.toDto(roomImageService.upload(file, userId)));
    }

    @GetMapping
    public ResponseEntity<List<RoomImageDto>> getAll(Authentication auth) {
        UUID userId = (UUID) auth.getPrincipal();
        return ResponseEntity.ok(roomImageService.getByUserId(userId).stream().map(RoomImageMapper::toDto).toList());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id, Authentication auth) {
        UUID userId = (UUID) auth.getPrincipal();
        roomImageService.delete(id, userId);
        return ResponseEntity.noContent().build();
    }
}
