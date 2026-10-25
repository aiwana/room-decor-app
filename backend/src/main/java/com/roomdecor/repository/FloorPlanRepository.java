package com.roomdecor.repository;

import com.roomdecor.entity.FloorPlan;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface FloorPlanRepository extends JpaRepository<FloorPlan, UUID> {
    Optional<FloorPlan> findByRoomImageId(UUID roomImageId);
}
