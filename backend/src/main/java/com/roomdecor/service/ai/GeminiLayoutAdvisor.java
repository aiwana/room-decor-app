package com.roomdecor.service.ai;

import com.roomdecor.exception.BadRequestException;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * Layout suggestion by Gemini, text only: the floor plan and the furniture list go in,
 * positions come out. No photo is sent, so a call is small and fast.
 */
public class GeminiLayoutAdvisor implements LayoutAdvisor {

    private final GeminiHttp gemini;

    public GeminiLayoutAdvisor(String apiKey, String model, String thinkingLevel) {
        this(apiKey, model, thinkingLevel, GeminiHttp.defaultHttpClient(), GeminiHttp.DEFAULT_RETRY_DELAYS_MS);
    }

    /** For tests: custom HTTP client and retry delays. */
    GeminiLayoutAdvisor(String apiKey, String model, String thinkingLevel, HttpClient http, long[] retryDelaysMs) {
        this.gemini = new GeminiHttp(apiKey, model, thinkingLevel, http, retryDelaysMs);
    }

    @Override
    public boolean usesAi() {
        return true;
    }

    @Override
    public LayoutResult suggest(LayoutRequest request) {
        try {
            String prompt = LayoutPrompt.build(request, gemini.mapper());
            return LayoutPrompt.parse(gemini.generateJson(List.of(Map.of("text", prompt)), 0.4, Duration.ofSeconds(90)));
        } catch (BadRequestException e) {
            throw e;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new BadRequestException("Layout suggestion was interrupted");
        } catch (Exception e) {
            throw new BadRequestException("Failed to suggest a layout: " + e.getMessage());
        }
    }
}
