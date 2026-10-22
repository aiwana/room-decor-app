package com.roomdecor.service;

import com.roomdecor.dto.ai.AiSuggestionRequest;
import com.roomdecor.dto.ai.AiSuggestionResponse;
import com.roomdecor.dto.design.PlacementDto;
import com.roomdecor.entity.RoomImage;
import com.roomdecor.exception.ResourceNotFoundException;
import com.roomdecor.repository.RoomImageRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class AiService {

    private final RoomImageRepository roomImageRepository;

    public AiService(RoomImageRepository roomImageRepository) {
        this.roomImageRepository = roomImageRepository;
    }

    public AiSuggestionResponse suggestLayout(AiSuggestionRequest request) {
        // Placeholder: actual AI integration would go here
        // Could call an external API or run a model inference
        RoomImage image = roomImageRepository.findById(request.roomImageId())
            .orElseThrow(() -> new ResourceNotFoundException("Room image not found"));

        List<PlacementDto> placements = List.of(); // TODO: implement AI logic
        String description = "AI layout suggestion for room image: " + image.getId();

        return new AiSuggestionResponse(placements, description);
    }

    public String describeRoom(UUID roomImageId) {
        RoomImage image = roomImageRepository.findById(roomImageId)
            .orElseThrow(() -> new ResourceNotFoundException("Room image not found"));

        // Placeholder: actual AI integration would go here
        return "Room description placeholder for image: " + image.getId();
    }
}
