package com.roomdecor.service.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.roomdecor.entity.WallSegment;
import com.roomdecor.exception.BadRequestException;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;

/**
 * Gemini API implementation of RoomVisionClient.
 * Uses inline image data (base64), so room photos do not need a public URL.
 */
public class GeminiVisionClient implements RoomVisionClient {

    private static final String ENDPOINT =
        "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s";

    private final ObjectMapper mapper = new ObjectMapper();
    private final String apiKey;
    private final String model;
    private final HttpClient http;

    public GeminiVisionClient(String apiKey, String model) {
        this.apiKey = apiKey;
        this.model = model;
        this.http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .build();
    }

    @Override
    public RoomAnalysisResult analyze(ImageInput input) {
        if (input.bytes() == null || input.bytes().length == 0) {
            throw new BadRequestException("Room image data is empty");
        }
        String mimeType = input.mimeType() == null || input.mimeType().isBlank()
            ? "image/jpeg"
            : input.mimeType();
        String base64 = Base64.getEncoder().encodeToString(input.bytes());

        try {
            Map<String, Object> body = Map.of(
                "contents", List.of(Map.of(
                    "parts", List.of(
                        Map.of("text", RoomScanPrompt.TEXT),
                        Map.of("inline_data", Map.of(
                            "mime_type", mimeType,
                            "data", base64
                        ))
                    )
                )),
                "generationConfig", Map.of(
                    "responseMimeType", "application/json",
                    "temperature", 0.1
                )
            );

            HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(String.format(ENDPOINT, model, apiKey)))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body)))
                .timeout(Duration.ofSeconds(90))
                .build();

            HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() != 200) {
                throw new BadRequestException("Gemini API error: " + resp.body());
            }

            JsonNode root = mapper.readTree(resp.body());
            JsonNode candidates = root.path("candidates");
            if (!candidates.isArray() || candidates.isEmpty()) {
                throw new BadRequestException("Gemini returned no candidates");
            }

            String content = "";
            JsonNode parts = candidates.get(0).path("content").path("parts");
            if (parts.isArray()) {
                for (JsonNode part : parts) {
                    if (part.has("text")) {
                        content = part.path("text").asText();
                        break;
                    }
                }
            }
            if (content.isBlank()) {
                throw new BadRequestException("Gemini returned an empty response");
            }

            JsonNode parsed = mapper.readTree(content);
            List<WallSegment> walls = new ArrayList<>();
            for (JsonNode w : parsed.path("walls")) {
                walls.add(new WallSegment(
                    w.path("x1").asDouble(),
                    w.path("y1").asDouble(),
                    w.path("x2").asDouble(),
                    w.path("y2").asDouble()
                ));
            }

            return new RoomAnalysisResult(
                parsed.path("roomWidthMeters").asDouble(4.0),
                parsed.path("roomDepthMeters").asDouble(4.0),
                parsed.path("ceilingHeightMeters").asDouble(2.7),
                walls,
                parsed.path("description").asText("Room scanned by Gemini")
            );
        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            throw new BadRequestException("Failed to analyze room image: " + e.getMessage());
        }
    }
}
