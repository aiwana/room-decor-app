package com.roomdecor.repository;

import com.roomdecor.entity.Material;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface MaterialRepository extends JpaRepository<Material, UUID> {
    List<Material> findByKindOrderByNameAsc(String kind);
    List<Material> findAllByOrderByKindAscNameAsc();
}
