package com.roomdecor.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

import java.nio.file.Path;

@Configuration
public class StorageConfig {

    @Value("${app.storage.upload-dir}")
    private String uploadDir;

    @Value("${app.storage.base-url}")
    private String baseUrl;

    public Path getUploadPath() {
        return Path.of(uploadDir).toAbsolutePath().normalize();
    }

    public String getBaseUrl() {
        return baseUrl;
    }
}
