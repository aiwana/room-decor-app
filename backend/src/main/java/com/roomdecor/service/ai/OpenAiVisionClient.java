package com.roomdecor.service.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.roomdecor.entity.WallSegment;
import com.roomdecor.exception.BadRequestException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * OpenAI GPT-4o Vision implementation of RoomVisionClient.
 * Sends the room photo to GPT-4o and asks it to return a structured JSON
 * describing the room walls and dimensions.
 *
 * Enabled when app.ai.openai.api-key is set. Otherwise falls back to the
 * mock client so the app still runs without an API key.
 */
@Component
@ConditionalOnProperty(name = "app.ai.openai.api-key")
public class OpenAiVisionClient implements RoomVisionClient {

    private final ObjectMapper mapper = new ObjectMapper();
    private final String apiKey;
    private final String model;
    private final HttpClient http;

    public OpenAiVisionClient(
        @Value("${app.ai.openai.api-key}") String apiKey,
        @Value("${app.ai.openai.model:gpt-4o}") String model
    ) {
        this.apiKey = apiKey;
        this.model = model;
        this.http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .build();
    }

    @Override
    public RoomAnalysisResult analyze(String imageUrl) {
        String prompt = """
            You are a room-scanning assistant. Analyze this room photo and return a JSON object
            describing a top-down 2D floor plan in METERS. The origin is the top-left corner.

            Return ONLY valid JSON with this exact shape:
            {
              "roomWidthMeters": <number>,
              "roomDepthMeters": <number>,
              "ceilingHeightMeters": <number>,
              "walls": [ {"x1": <num>, "y1": <num>, "x2": <num>, "y2": <num>} ],
              "description": "<short description of the room style and detected features>"
            }

            Rules:
            - Walls are line segments forming the room boundary (typically 4 for a rectangular room).
            - x = horizontal (width), y = vertical (depth), in meters from origin.
            - For a rectangular room: walls connect the 4 corners.
            - Description: 1-2 sentences in English.
            """;

        try {
            Map<String, Object> body = Map.of(
                "model", model,
                "messages", List.of(
                    Map.of("role", "system", "content", prompt),
                    Map.of("role", "user", "content", List.of(
                        Map.of("type", "text", "text", "Analyze this room and return the floor plan JSON."),
                        Map.of("type", "image_url", "image_url", Map.of("url", imageUrl))
                    ))
                ),
                "response_format", Map.of("type", "json_object"),
                "max_tokens", 1000
            );

            HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create("https://api.openai.com/v1/chat/completions"))
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body)))
                .timeout(Duration.ofSeconds(60))
                .build();

            HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() != 200) {
                throw new BadRequestException("OpenAI API error: " + resp.body());
            }

            JsonNode root = mapper.readTree(resp.body());
            String content = root.path("choices").get(0).path("message").path("content").asText();
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
