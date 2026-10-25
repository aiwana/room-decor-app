package com.roomdecor.controller;

import com.roomdecor.config.StorageConfig;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.file.Path;

/**
 * Serves uploaded files (room images, thumbnails) over HTTP so that
 * the AI vision client and the mobile app can access them by URL.
 */
@RestController
public class FileController {

    private final StorageConfig storageConfig;

    public FileController(StorageConfig storageConfig) {
        this.storageConfig = storageConfig;
    }

    @GetMapping("/files/**")
    public ResponseEntity<Resource> serveFile(HttpServletRequest request) {
        String relative = request.getRequestURI().substring("/files/".length());
        Path root = storageConfig.getUploadPath().toAbsolutePath().normalize();
        Path file = root.resolve(relative).normalize();
        // Block "../" so only files inside the upload folder can be read
        if (!file.startsWith(root) || !file.toFile().isFile()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok()
            .contentType(MediaType.IMAGE_JPEG)
            .body(new FileSystemResource(file));
    }
}
