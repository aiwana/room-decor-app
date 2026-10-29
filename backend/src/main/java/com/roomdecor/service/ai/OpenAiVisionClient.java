package com.roomdecor.service.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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
 * Sends the room photos as inline data URLs so local uploads do not need a public URL.
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
    public RoomAnalysisResult analyze(List<ImageInput> images, ScanHints hints) {
        if (images == null || images.isEmpty()) {
            throw new BadRequestException("No room image to analyze");
        }

        try {
            List<Map<String, Object>> userContent = new ArrayList<>();
            userContent.add(Map.of("type", "text", "text", "Analyze this room and return the floor plan JSON."));
            for (ImageInput input : images) {
                if (input.bytes() == null || input.bytes().length == 0) {
                    throw new BadRequestException("Room image data is empty");
                }
                String mimeType = input.mimeType() == null || input.mimeType().isBlank()
                    ? "image/jpeg"
                    : input.mimeType();
                String dataUrl = "data:" + mimeType + ";base64,"
                    + Base64.getEncoder().encodeToString(input.bytes());
                userContent.add(Map.of("type", "image_url", "image_url", Map.of("url", dataUrl)));
            }

            Map<String, Object> body = Map.of(
                "model", model,
                "messages", List.of(
                    Map.of("role", "system", "content", RoomScanPrompt.build(images.size(), hints)),
                    Map.of("role", "user", "content", userContent)
                ),
                "response_format", Map.of("type", "json_object"),
                "max_tokens", 1500
            );

            HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create("https://api.openai.com/v1/chat/completions"))
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body)))
                .timeout(Duration.ofSeconds(120))
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

            return RoomScanParser.parse(mapper.readTree(content), "Room scanned by AI");
        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            throw new BadRequestException("Failed to analyze room image: " + e.getMessage());
        }
    }
}
