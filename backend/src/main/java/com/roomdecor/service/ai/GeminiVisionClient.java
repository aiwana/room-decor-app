package com.roomdecor.service.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.roomdecor.exception.BadRequestException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Gemini API implementation of RoomVisionClient.
 * Uses inline image data (base64), so room photos do not need a public URL.
 * All photos of the room are sent in one request so the model can combine them.
 * When Google is overloaded (503) or rate-limits us (429) the request is retried
 * a couple of times before giving up with a short, user-friendly message.
 */
public class GeminiVisionClient implements RoomVisionClient {

    private static final Logger log = LoggerFactory.getLogger(GeminiVisionClient.class);

    /** Waits before each retry; two retries in total. */
    private static final long[] DEFAULT_RETRY_DELAYS_MS = {2_000, 5_000};

    static final String BUSY_MESSAGE = "AI service is busy right now, please try again in a minute";

    private static final String ENDPOINT =
        "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent";

    private final ObjectMapper mapper = new ObjectMapper();
    private final String apiKey;
    private final String model;
    private final String thinkingLevel;
    private final HttpClient http;
    private final long[] retryDelaysMs;

    /**
     * @param thinkingLevel Gemini 3 thinking level (minimal | low | medium | high); blank = model default.
     *                      The default "high" can take minutes for several photos.
     */
    public GeminiVisionClient(String apiKey, String model, String thinkingLevel) {
        this(apiKey, model, thinkingLevel,
            HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(15)).build(),
            DEFAULT_RETRY_DELAYS_MS);
    }

    /** For tests: custom HTTP client and retry delays. */
    GeminiVisionClient(String apiKey, String model, String thinkingLevel, HttpClient http, long[] retryDelaysMs) {
        this.apiKey = apiKey;
        this.model = model;
        this.thinkingLevel = thinkingLevel == null ? "" : thinkingLevel.trim().toLowerCase(Locale.ROOT);
        this.http = http;
        this.retryDelaysMs = retryDelaysMs.clone();
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

            Map<String, Object> generationConfig = new HashMap<>();
            generationConfig.put("responseMimeType", "application/json");
            generationConfig.put("temperature", 0.1);
            if (!thinkingLevel.isBlank()) {
                generationConfig.put("thinkingConfig", Map.of("thinkingLevel", thinkingLevel));
            }
            Map<String, Object> body = Map.of(
                "contents", List.of(Map.of("parts", parts)),
                "generationConfig", generationConfig
            );

            // Key goes in a header, not in the URL, so it never ends up in access logs
            HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(String.format(ENDPOINT, model)))
                .header("Content-Type", "application/json")
                .header("x-goog-api-key", apiKey)
                .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body)))
                .timeout(Duration.ofSeconds(180))
                .build();

            HttpResponse<String> resp = sendWithRetry(req);
            int status = resp.statusCode();
            if (status != 200) {
                // Full Google error stays in the server log; the client gets a short message
                log.warn("Gemini API error {}: {}", status, resp.body());
                if (isRetryable(status)) {
                    throw new BadRequestException(BUSY_MESSAGE);
                }
                if (status == 404) {
                    throw new BadRequestException("AI model '" + model + "' is not available, check GEMINI_MODEL");
                }
                throw new BadRequestException("AI service error (HTTP " + status + ")");
            }

            JsonNode root = mapper.readTree(resp.body());
            JsonNode candidates = root.path("candidates");
            if (!candidates.isArray() || candidates.isEmpty()) {
                throw new BadRequestException("Gemini returned no candidates");
            }

            String content = "";
            JsonNode responseParts = candidates.get(0).path("content").path("parts");
            if (responseParts.isArray()) {
                for (JsonNode part : responseParts) {
                    if (part.has("text")) {
                        content = part.path("text").asText();
                        break;
                    }
                }
            }
            if (content.isBlank()) {
                throw new BadRequestException("Gemini returned an empty response");
            }

            return RoomScanParser.parse(mapper.readTree(content), "Room scanned by Gemini");
        } catch (BadRequestException e) {
            throw e;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new BadRequestException("Room scan was interrupted");
        } catch (Exception e) {
            throw new BadRequestException("Failed to analyze room image: " + e.getMessage());
        }
    }

    private HttpResponse<String> sendWithRetry(HttpRequest req) throws IOException, InterruptedException {
        for (int attempt = 0; ; attempt++) {
            HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString());
            if (!isRetryable(resp.statusCode()) || attempt >= retryDelaysMs.length) {
                return resp;
            }
            log.info("Gemini busy (HTTP {}), retry {} of {} in {} ms",
                resp.statusCode(), attempt + 1, retryDelaysMs.length, retryDelaysMs[attempt]);
            Thread.sleep(retryDelaysMs[attempt]);
        }
    }

    private static boolean isRetryable(int status) {
        return status == 429 || status == 503;
    }
}
