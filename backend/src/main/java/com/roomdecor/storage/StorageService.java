package com.roomdecor.storage;

import com.roomdecor.config.StorageConfig;
import com.roomdecor.exception.BadRequestException;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;
import java.util.UUID;

@Service
public class StorageService {

    private final StorageConfig storageConfig;

    public StorageService(StorageConfig storageConfig) {
        this.storageConfig = storageConfig;
    }

    public String store(MultipartFile file, String subdir) {
        try {
            Path uploadPath = storageConfig.getUploadPath().resolve(subdir);
            Files.createDirectories(uploadPath);

            String originalName = file.getOriginalFilename();
            String extension = originalName != null && originalName.contains(".")
                ? originalName.substring(originalName.lastIndexOf("."))
                : "";
            String filename = UUID.randomUUID() + extension;

            Path target = uploadPath.resolve(filename);
            file.transferTo(target.toFile());

            return subdir + "/" + filename;
        } catch (IOException e) {
            throw new BadRequestException("Failed to store file: " + e.getMessage());
        }
    }

    /** Read an uploaded image from disk using its public URL (the part after /files/). */
    public byte[] readImageBytes(String url) {
        Path root = storageConfig.getUploadPath();
        Path file = root.resolve(relativePathFromUrl(url)).normalize();
        if (!file.startsWith(root) || !Files.isRegularFile(file)) {
            throw new BadRequestException("Room image file not found on server");
        }
        try {
            return Files.readAllBytes(file);
        } catch (IOException e) {
            throw new BadRequestException("Failed to read image: " + e.getMessage());
        }
    }

    public String imageMimeType(String url) {
        String clean = url;
        int query = clean.indexOf('?');
        if (query >= 0) {
            clean = clean.substring(0, query);
        }
        String lower = clean.toLowerCase(Locale.ROOT);
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".webp")) return "image/webp";
        if (lower.endsWith(".gif")) return "image/gif";
        return "image/jpeg";
    }

    private String relativePathFromUrl(String url) {
        int index = url.indexOf("/files/");
        if (index < 0) {
            throw new BadRequestException("Unsupported image URL");
        }
        String relative = url.substring(index + "/files/".length());
        int query = relative.indexOf('?');
        return query >= 0 ? relative.substring(0, query) : relative;
    }
}
