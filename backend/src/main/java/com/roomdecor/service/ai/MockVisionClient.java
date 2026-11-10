package com.roomdecor.service.ai;

import com.roomdecor.entity.Opening;
import com.roomdecor.entity.WallSegment;

import java.util.List;
import java.util.Locale;

/**
 * Fallback implementation used when no AI provider is configured.
 * Returns a simple rectangular room with one door so the app remains functional
 * during development without an API key. Chosen in {@link com.roomdecor.config.AiConfig}.
 */
public class MockVisionClient implements RoomVisionClient {

    @Override
    public RoomAnalysisResult analyze(List<ImageInput> images, ScanHints hints) {
        // Default rectangular room: 4m x 4m, 2.7m ceiling. ScanCorrection later stretches it to the
        // length/width the user measured; older apps only send the wall facing the camera.
        double w = hints != null && hints.referenceLengthMeters() != null ? hints.referenceLengthMeters() : 4.0;
        double d = 4.0;
        return new RoomAnalysisResult(
            w, d, 2.7,
            List.of(
                new WallSegment(0, 0, w, 0),  // top
                new WallSegment(w, 0, w, d),  // right
                new WallSegment(w, d, 0, d),  // bottom
                new WallSegment(0, d, 0, 0)   // left
            ),
            List.of(new Opening(Opening.DOOR, 0.5, d, 1.35, d)),
            String.format(Locale.ROOT,
                "Phòng mẫu hình chữ nhật, có 1 cửa ra vào, quét từ %d ảnh (chưa cấu hình khoá AI).",
                images.size())
        );
    }
}
