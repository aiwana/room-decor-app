package com.roomdecor.service;

import com.roomdecor.config.StorageConfig;
import com.roomdecor.entity.RoomImage;
import com.roomdecor.entity.User;
import com.roomdecor.exception.BadRequestException;
import com.roomdecor.exception.ResourceNotFoundException;
import com.roomdecor.repository.RoomImageRepository;
import com.roomdecor.repository.UserRepository;
import com.roomdecor.storage.StorageService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.InputStream;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class RoomImageService {

    private final RoomImageRepository roomImageRepository;
    private final UserRepository userRepository;
    private final StorageService storageService;
    private final StorageConfig storageConfig;

    public RoomImageService(RoomImageRepository roomImageRepository, UserRepository userRepository,
                           StorageService storageService, StorageConfig storageConfig) {
        this.roomImageRepository = roomImageRepository;
        this.userRepository = userRepository;
        this.storageService = storageService;
        this.storageConfig = storageConfig;
    }

    public RoomImage upload(MultipartFile file, UUID userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (file.isEmpty()) {
            throw new BadRequestException("File is empty");
        }

        try (InputStream is = file.getInputStream()) {
            BufferedImage img = ImageIO.read(is);
            if (img == null) {
                throw new BadRequestException("Invalid image file");
            }

            String filename = storageService.store(file, "rooms/" + userId);
            String url = storageConfig.getBaseUrl() + "/" + filename;

            RoomImage roomImage = RoomImage.builder()
                .user(user)
                .url(url)
                .width(img.getWidth())
                .height(img.getHeight())
                .capturedAt(Instant.now())
                .build();

            return roomImageRepository.save(roomImage);
        } catch (Exception e) {
            throw new BadRequestException("Failed to process image: " + e.getMessage());
        }
    }

    public List<RoomImage> getByUserId(UUID userId) {
        return roomImageRepository.findByUserId(userId);
    }

    public void delete(UUID id, UUID userId) {
        RoomImage image = roomImageRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Room image not found"));
        if (!image.getUser().getId().equals(userId)) {
            throw new BadRequestException("Access denied");
        }
        roomImageRepository.delete(image);
    }
}
