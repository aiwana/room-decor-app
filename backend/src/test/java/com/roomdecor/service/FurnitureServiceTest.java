package com.roomdecor.service;

import com.roomdecor.dto.furniture.FurnitureDto;
import com.roomdecor.dto.furniture.FurnitureRequest;
import com.roomdecor.entity.Furniture;
import com.roomdecor.exception.ConflictException;
import com.roomdecor.exception.ResourceNotFoundException;
import com.roomdecor.repository.FurnitureRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FurnitureServiceTest {

    @Mock
    private FurnitureRepository furnitureRepository;

    @InjectMocks
    private FurnitureService furnitureService;

    @Test
    void getAllFiltersByCategoryWhenGiven() {
        when(furnitureRepository.findByCategory("sofa")).thenReturn(List.of(item("Sofa")));

        List<FurnitureDto> result = furnitureService.getAll("sofa");

        assertThat(result).extracting(FurnitureDto::name).containsExactly("Sofa");
        verify(furnitureRepository, never()).findAll();
    }

    @Test
    void getAllReturnsEverythingWhenCategoryBlank() {
        when(furnitureRepository.findAll()).thenReturn(List.of(item("A"), item("B")));

        assertThat(furnitureService.getAll(" ")).hasSize(2);
    }

    @Test
    void getByIdOfUnknownItemThrowsNotFound() {
        UUID id = UUID.randomUUID();
        when(furnitureRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> furnitureService.getById(id))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void createTrimsTextAndAppliesDefaults() {
        when(furnitureRepository.save(any(Furniture.class))).thenAnswer(inv -> inv.getArgument(0));

        FurnitureDto dto = furnitureService.create(new FurnitureRequest(
            "  Ghế đôn ", "chair", 40.0, 45.0, 40.0, " ", null,
            new BigDecimal("500000"), null, null, null, null));

        assertThat(dto.name()).isEqualTo("Ghế đôn");
        assertThat(dto.modelUrl()).isNull();
        assertThat(dto.currency()).isEqualTo("VND");
        assertThat(dto.stockStatus()).isEqualTo("in_stock");
    }

    @Test
    void updateChangesFieldsButKeepsId() {
        Furniture existing = item("Cũ");
        when(furnitureRepository.findById(existing.getId())).thenReturn(Optional.of(existing));
        when(furnitureRepository.save(any(Furniture.class))).thenAnswer(inv -> inv.getArgument(0));

        FurnitureDto dto = furnitureService.update(existing.getId(), new FurnitureRequest(
            "Mới", "table", 120.0, 75.0, 60.0, null, null, null, "VND", "Hiện đại", "Gỗ", "preorder"));

        ArgumentCaptor<Furniture> saved = ArgumentCaptor.forClass(Furniture.class);
        verify(furnitureRepository).save(saved.capture());
        assertThat(saved.getValue().getId()).isEqualTo(existing.getId());
        assertThat(dto.name()).isEqualTo("Mới");
        assertThat(dto.stockStatus()).isEqualTo("preorder");
    }

    @Test
    void updateOfUnknownItemThrowsNotFound() {
        UUID id = UUID.randomUUID();
        when(furnitureRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> furnitureService.update(id, new FurnitureRequest(
            "X", "chair", 1.0, 1.0, 1.0, null, null, null, null, null, null, null)))
            .isInstanceOf(ResourceNotFoundException.class);
        verify(furnitureRepository, never()).save(any());
    }

    @Test
    void deleteUnusedItemRemovesIt() {
        UUID id = UUID.randomUUID();
        when(furnitureRepository.existsById(id)).thenReturn(true);
        when(furnitureRepository.isUsedInDesigns(id)).thenReturn(false);

        furnitureService.delete(id);

        verify(furnitureRepository).deleteById(id);
    }

    @Test
    void deleteItemUsedInDesignsIsRefused() {
        UUID id = UUID.randomUUID();
        when(furnitureRepository.existsById(id)).thenReturn(true);
        when(furnitureRepository.isUsedInDesigns(id)).thenReturn(true);

        assertThatThrownBy(() -> furnitureService.delete(id))
            .isInstanceOf(ConflictException.class);
        verify(furnitureRepository, never()).deleteById(any());
    }

    @Test
    void deleteUnknownItemThrowsNotFound() {
        UUID id = UUID.randomUUID();
        when(furnitureRepository.existsById(id)).thenReturn(false);

        assertThatThrownBy(() -> furnitureService.delete(id))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    private static Furniture item(String name) {
        return Furniture.builder()
            .id(UUID.randomUUID()).name(name).category("sofa")
            .width(200.0).height(80.0).depth(90.0)
            .build();
    }
}
