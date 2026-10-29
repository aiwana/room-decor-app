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
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Shared Gemini generateContent call (JSON mode) used by the room scan and the layout suggestion.
 * The key goes in a header, never in the URL. When Google is overloaded (503) or rate-limits us (429)
 * the request is retried a couple of times before giving up with a short, user-friendly message.
 */
class GeminiHttp {

    private static final Logger log = LoggerFactory.getLogger(GeminiHttp.class);

    /** Waits before each retry; two retries in total. */
    static final long[] DEFAULT_RETRY_DELAYS_MS = {2_000, 5_000};

    static final String BUSY_MESSAGE = "AI service is busy right now, please try again in a minute";

    private static final String ENDPOINT =
        "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent";

    private final ObjectMapper mapper = new ObjectMapper();
    private final String apiKey;
    private final String model;
    private final String thinkingLevel;
    private final HttpClient http;
    private final long[] retryDelaysMs;

    GeminiHttp(String apiKey, String model, String thinkingLevel, HttpClient http, long[] retryDelaysMs) {
        this.apiKey = apiKey;
        this.model = model;
        this.thinkingLevel = thinkingLevel == null ? "" : thinkingLevel.trim().toLowerCase(Locale.ROOT);
        this.http = http;
        this.retryDelaysMs = retryDelaysMs.clone();
    }

    static HttpClient defaultHttpClient() {
        return HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(15)).build();
    }

    String model() {
        return model;
    }

    String thinkingLevel() {
        return thinkingLevel;
    }

    ObjectMapper mapper() {
        return mapper;
    }

    /**
     * Sends the parts (text and/or inline_data) and returns the model's JSON answer.
     *
     * @throws BadRequestException with a short message on any API error
     */
    JsonNode generateJson(List<Map<String, Object>> parts, double temperature, Duration timeout)
        throws IOException, InterruptedException {
        Map<String, Object> generationConfig = new HashMap<>();
        generationConfig.put("responseMimeType", "application/json");
        generationConfig.put("temperature", temperature);
        if (!thinkingLevel.isBlank()) {
            generationConfig.put("thinkingConfig", Map.of("thinkingLevel", thinkingLevel));
        }
        Map<String, Object> body = Map.of(
            "contents", List.of(Map.of("parts", parts)),
            "generationConfig", generationConfig
        );

        HttpRequest req = HttpRequest.newBuilder()
            .uri(URI.create(String.format(ENDPOINT, model)))
            .header("Content-Type", "application/json")
            .header("x-goog-api-key", apiKey)
            .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body)))
            .timeout(timeout)
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
        return mapper.readTree(content);
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
