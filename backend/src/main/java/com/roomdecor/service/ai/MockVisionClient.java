package com.roomdecor.service.ai;

import com.roomdecor.entity.WallSegment;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Fallback implementation used when no AI provider is configured.
 * Returns a simple rectangular room so the app remains functional
 * during development without an API key.
 */
@Component
@ConditionalOnMissingBean(RoomVisionClient.class)
public class MockVisionClient implements RoomVisionClient {

    @Override
    public RoomAnalysisResult analyze(String imageUrl) {
        // Default rectangular room: 4m x 4m, 2.7m ceiling
        double w = 4.0;
        double d = 4.0;
        return new RoomAnalysisResult(
            w, d, 2.7,
            List.of(
                new WallSegment(0, 0, w, 0),  // top
                new WallSegment(w, 0, w, d),  // right
                new WallSegment(w, d, 0, d),  // bottom
                new WallSegment(0, d, 0, 0)   // left
            ),
            "Mock scan: rectangular room 4m x 4m (no API key configured)"
        );
    }
}
