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
 * OpenAI GPT-4o Vision implementation of RoomVisionClient.
 * Sends the room photo as an inline data URL so local uploads do not need a public URL.
 */
public class OpenAiVisionClient implements RoomVisionClient {

    private final ObjectMapper mapper = new ObjectMapper();
    private final String apiKey;
    private final String model;
    private final HttpClient http;

    public OpenAiVisionClient(String apiKey, String model) {
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
        String dataUrl = "data:" + mimeType + ";base64,"
            + Base64.getEncoder().encodeToString(input.bytes());

        try {
            Map<String, Object> body = Map.of(
                "model", model,
                "messages", List.of(
                    Map.of("role", "system", "content", RoomScanPrompt.TEXT),
                    Map.of("role", "user", "content", List.of(
                        Map.of("type", "text", "text", "Analyze this room and return the floor plan JSON."),
                        Map.of("type", "image_url", "image_url", Map.of("url", dataUrl))
                    ))
                ),
                "response_format", Map.of("type", "json_object"),
                "max_tokens", 1200
            );

            HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create("https://api.openai.com/v1/chat/completions"))
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body)))
                .timeout(Duration.ofSeconds(90))
                .build();

            HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() != 200) {
                throw new BadRequestException("OpenAI API error: " + resp.body());
            }

            JsonNode root = mapper.readTree(resp.body());
            JsonNode choices = root.path("choices");
            if (!choices.isArray() || choices.isEmpty()) {
                throw new BadRequestException("OpenAI returned no choices");
            }
            String content = choices.get(0).path("message").path("content").asText();
            if (content.isBlank()) {
                throw new BadRequestException("OpenAI returned an empty response");
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
                parsed.path("description").asText("Room scanned by AI")
            );
        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            throw new BadRequestException("Failed to analyze room image: " + e.getMessage());
        }
    }
}
