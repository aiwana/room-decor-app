package com.roomdecor.controller;

import com.roomdecor.dto.ai.*;
import com.roomdecor.service.AiService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
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

    @PostMapping("/suggest-layout")
    public ResponseEntity<AiSuggestionResponse> suggestLayout(@Valid @RequestBody AiSuggestionRequest request) {
        return ResponseEntity.ok(aiService.suggestLayout(request));
    }

    @PostMapping("/describe-room/{roomImageId}")
    public ResponseEntity<Map<String, String>> describeRoom(@PathVariable UUID roomImageId) {
        String description = aiService.describeRoom(roomImageId);
        return ResponseEntity.ok(Map.of("description", description));
    }
}
