package com.roomdecor.storage;

import com.roomdecor.config.StorageConfig;
import com.roomdecor.exception.BadRequestException;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
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
}
