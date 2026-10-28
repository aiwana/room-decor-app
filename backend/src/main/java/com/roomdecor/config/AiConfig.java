package com.roomdecor.config;

import com.roomdecor.service.ai.GeminiVisionClient;
import com.roomdecor.service.ai.MockVisionClient;
import com.roomdecor.service.ai.OpenAiVisionClient;
import com.roomdecor.service.ai.RoomVisionClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Picks the AI vision provider. Keys are usually present but empty in .env,
 * so the choice is made on a blank check instead of @ConditionalOnProperty.
 */
@Configuration
public class AiConfig {

    private static final Logger log = LoggerFactory.getLogger(AiConfig.class);

    @Bean
    public RoomVisionClient roomVisionClient(
        @Value("${app.ai.provider:}") String provider,
        @Value("${app.ai.openai.api-key:}") String openAiKey,
        @Value("${app.ai.openai.model:gpt-4o}") String openAiModel,
        @Value("${app.ai.gemini.api-key:}") String geminiKey,
        @Value("${app.ai.gemini.model:gemini-2.5-flash}") String geminiModel
    ) {
        String selected = provider == null ? "" : provider.trim().toLowerCase();
        if (selected.isBlank()) {
            if (geminiKey != null && !geminiKey.isBlank()) {
                selected = "gemini";
            } else if (openAiKey != null && !openAiKey.isBlank()) {
                selected = "openai";
            } else {
                selected = "mock";
            }
        }

        if ("gemini".equals(selected)) {
            if (geminiKey == null || geminiKey.isBlank()) {
                log.warn("AI room scan: AI_PROVIDER=gemini but GEMINI_API_KEY is blank, using MockVisionClient");
                return new MockVisionClient();
            }
            log.info("AI room scan: using Gemini model {}", geminiModel);
            return new GeminiVisionClient(geminiKey, geminiModel);
        }

        if ("openai".equals(selected)) {
            if (openAiKey == null || openAiKey.isBlank()) {
                log.warn("AI room scan: AI_PROVIDER=openai but OPENAI_API_KEY is blank, using MockVisionClient");
                return new MockVisionClient();
            }
            log.info("AI room scan: using OpenAI model {}", openAiModel);
            return new OpenAiVisionClient(openAiKey, openAiModel);
        }

        if (!"mock".equals(selected)) {
            log.warn("AI room scan: unknown AI_PROVIDER '{}', using MockVisionClient", selected);
        } else {
            log.info("AI room scan: using MockVisionClient");
        }
        return new MockVisionClient();
    }
}
