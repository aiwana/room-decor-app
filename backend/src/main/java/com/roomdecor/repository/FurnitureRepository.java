package com.roomdecor.repository;

import com.roomdecor.entity.Furniture;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface FurnitureRepository extends JpaRepository<Furniture, UUID> {
    List<Furniture> findByCategory(String category);
    List<Furniture> findByNameContainingIgnoreCase(String name);

    /** True when at least one saved design still places this item (furniture_placements has an FK to it). */
    @Query("select count(p) > 0 from FurniturePlacement p where p.furniture.id = :id")
    boolean isUsedInDesigns(@Param("id") UUID id);
}
