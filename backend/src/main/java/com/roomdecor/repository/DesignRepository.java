package com.roomdecor.repository;

import com.roomdecor.entity.Design;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface DesignRepository extends JpaRepository<Design, UUID> {
    List<Design> findByUserId(UUID userId);
}
