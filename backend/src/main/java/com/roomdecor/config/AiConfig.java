package com.roomdecor.config;

import com.roomdecor.service.ai.MockVisionClient;
import com.roomdecor.service.ai.OpenAiVisionClient;
import com.roomdecor.service.ai.RoomVisionClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Picks the AI vision provider. OPENAI_API_KEY is usually present but empty in .env,
 * so the choice is made on a blank check instead of @ConditionalOnProperty
 * (which treats an empty value as "set").
 */
@Configuration
public class AiConfig {

    private static final Logger log = LoggerFactory.getLogger(AiConfig.class);

    @Bean
    public RoomVisionClient roomVisionClient(
        @Value("${app.ai.openai.api-key:}") String apiKey,
        @Value("${app.ai.openai.model:gpt-4o}") String model
    ) {
        if (apiKey == null || apiKey.isBlank()) {
            log.info("AI room scan: OPENAI_API_KEY not set, using MockVisionClient");
            return new MockVisionClient();
        }
        log.info("AI room scan: using OpenAI model {}", model);
        return new OpenAiVisionClient(apiKey, model);
    }
}
