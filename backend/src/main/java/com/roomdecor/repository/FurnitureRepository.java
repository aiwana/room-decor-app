package com.roomdecor.repository;

import com.roomdecor.entity.Furniture;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface FurnitureRepository extends JpaRepository<Furniture, UUID> {
    List<Furniture> findByCategory(String category);
    List<Furniture> findByNameContainingIgnoreCase(String name);
}
