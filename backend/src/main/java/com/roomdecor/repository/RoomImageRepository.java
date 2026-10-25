package com.roomdecor.repository;

import com.roomdecor.entity.RoomImage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface RoomImageRepository extends JpaRepository<RoomImage, UUID> {
    List<RoomImage> findByUserId(UUID userId);
}
