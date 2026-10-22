package com.roomdecor.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    private static final String BEARER_SCHEME = "bearerAuth";

    @Bean
    public OpenAPI roomDecorOpenApi() {
        return new OpenAPI()
            .info(new Info()
                .title("RoomDecor API")
                .version("1.0.0")
                .description("REST API for the RoomDecor app. Log in, copy the token, "
                    + "then click Authorize and paste it to call protected endpoints."))
            // Adds the "Authorize" button and sends "Authorization: Bearer <token>" on every request
            .components(new Components().addSecuritySchemes(BEARER_SCHEME, new SecurityScheme()
                .type(SecurityScheme.Type.HTTP)
                .scheme("bearer")
                .bearerFormat("JWT")))
            .addSecurityItem(new SecurityRequirement().addList(BEARER_SCHEME));
    }
}
