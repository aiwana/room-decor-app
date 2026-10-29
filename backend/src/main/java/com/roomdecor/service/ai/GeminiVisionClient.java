package com.roomdecor.service.ai;

import com.roomdecor.exception.BadRequestException;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;

/**
 * Gemini API implementation of RoomVisionClient.
 * Uses inline image data (base64), so room photos do not need a public URL.
 * All photos of the room are sent in one request so the model can combine them.
 * HTTP call, retries on 429/503 and error messages live in GeminiHttp (shared with the layout advisor).
 */
public class GeminiVisionClient implements RoomVisionClient {

    static final String BUSY_MESSAGE = GeminiHttp.BUSY_MESSAGE;

    private final GeminiHttp gemini;

    /**
     * @param thinkingLevel Gemini 3 thinking level (minimal | low | medium | high); blank = model default.
     *                      The default "high" can take minutes for several photos.
     */
    public GeminiVisionClient(String apiKey, String model, String thinkingLevel) {
        this(apiKey, model, thinkingLevel, GeminiHttp.defaultHttpClient(), GeminiHttp.DEFAULT_RETRY_DELAYS_MS);
    }

    /** For tests: custom HTTP client and retry delays. */
    GeminiVisionClient(String apiKey, String model, String thinkingLevel, HttpClient http, long[] retryDelaysMs) {
        this.gemini = new GeminiHttp(apiKey, model, thinkingLevel, http, retryDelaysMs);
    }

    @Override
    public RoomAnalysisResult analyze(List<ImageInput> images, ScanHints hints) {
        if (images == null || images.isEmpty()) {
            throw new BadRequestException("No room image to analyze");
        }

        try {
            List<Map<String, Object>> parts = new ArrayList<>();
            parts.add(Map.of("text", RoomScanPrompt.build(images.size(), hints)));
            for (int i = 0; i < images.size(); i++) {
                ImageInput input = images.get(i);
                if (input.bytes() == null || input.bytes().length == 0) {
                    throw new BadRequestException("Room image data is empty");
                }
                String mimeType = input.mimeType() == null || input.mimeType().isBlank()
                    ? "image/jpeg"
                    : input.mimeType();
                parts.add(Map.of("text", "Photo " + (i + 1) + ":"));
                parts.add(Map.of("inline_data", Map.of(
                    "mime_type", mimeType,
                    "data", Base64.getEncoder().encodeToString(input.bytes())
                )));
            }

            return RoomScanParser.parse(gemini.generateJson(parts, 0.1, Duration.ofSeconds(180)), "Room scanned by Gemini");
        } catch (BadRequestException e) {
            throw e;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new BadRequestException("Room scan was interrupted");
        } catch (Exception e) {
            throw new BadRequestException("Failed to analyze room image: " + e.getMessage());
        }
    }
}
