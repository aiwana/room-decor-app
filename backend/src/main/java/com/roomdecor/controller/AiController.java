package com.roomdecor.controller;

import com.roomdecor.dto.ai.*;
import com.roomdecor.service.AiService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/ai")
public class AiController {

    private final AiService aiService;

    public AiController(AiService aiService) {
        this.aiService = aiService;
    }

    @PostMapping("/scan-room")
    public ResponseEntity<ScanRoomResponse> scanRoom(@Valid @RequestBody ScanRoomRequest request, Authentication auth) {
        UUID userId = (UUID) auth.getPrincipal();
        return ResponseEntity.ok(aiService.scanRoom(request, userId));
    }

    @PostMapping("/suggest-layout")
    public ResponseEntity<AiSuggestionResponse> suggestLayout(@Valid @RequestBody AiSuggestionRequest request,
                                                              Authentication auth) {
        UUID userId = (UUID) auth.getPrincipal();
        return ResponseEntity.ok(aiService.suggestLayout(request, userId));
    }

    @PostMapping("/describe-room/{roomImageId}")
    public ResponseEntity<Map<String, String>> describeRoom(@PathVariable UUID roomImageId) {
        String description = aiService.describeRoom(roomImageId);
        return ResponseEntity.ok(Map.of("description", description));
    }
}
