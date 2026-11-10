package com.roomdecor.service.ai;

import com.roomdecor.entity.Opening;
import com.roomdecor.entity.WallSegment;

import java.util.List;

/**
 * Abstraction over a vision AI provider (OpenAI Vision, Gemini, etc.)
 * that analyzes one or more photos of a room and returns a 2D floor plan.
 */
public interface RoomVisionClient {

    /**
     * Analyze photos of one room and produce floor plan data.
     *
     * @param images photos of the same room; the first one is the main photo
     * @param hints  optional extra information from the user (may be {@link ScanHints#NONE})
     * @return analysis result with walls, openings, dimensions, description
     */
    RoomAnalysisResult analyze(List<ImageInput> images, ScanHints hints);

    record ImageInput(String url, byte[] bytes, String mimeType) {}

    /**
     * What the user measured (all optional, null = not given).
     *
     * @param referenceLengthMeters real length of the wall facing the camera in the main photo (older app versions)
     * @param roomLengthMeters      length of the room (the longer side)
     * @param roomWidthMeters       width of the room (the shorter side)
     * @param ceilingHeightMeters   floor-to-ceiling height
     */
    record ScanHints(Double referenceLengthMeters, Double roomLengthMeters, Double roomWidthMeters,
                     Double ceilingHeightMeters) {
        public static final ScanHints NONE = new ScanHints(null, null, null, null);

        public ScanHints(Double referenceLengthMeters) {
            this(referenceLengthMeters, null, null, null);
        }
    }

    record RoomAnalysisResult(
        double roomWidthMeters,
        double roomDepthMeters,
        double ceilingHeightMeters,
        List<WallSegment> walls,
        List<Opening> openings,
        String description
    ) {}
}
