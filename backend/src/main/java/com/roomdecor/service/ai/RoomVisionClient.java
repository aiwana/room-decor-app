package com.roomdecor.service.ai;

import com.roomdecor.entity.WallSegment;

import java.util.List;

/**
 * Abstraction over a vision AI provider (OpenAI Vision, Gemini, etc.)
 * that analyzes a room photo and returns a 2D floor plan.
 */
public interface RoomVisionClient {

    /**
     * Analyze a room image and produce floor plan data.
     *
     * @param input image bytes plus the original URL/mime type
     * @return analysis result with walls, dimensions, description
     */
    RoomAnalysisResult analyze(ImageInput input);

    record ImageInput(String url, byte[] bytes, String mimeType) {}

    record RoomAnalysisResult(
        double roomWidthMeters,
        double roomDepthMeters,
        double ceilingHeightMeters,
        List<WallSegment> walls,
        String description
    ) {}
}
