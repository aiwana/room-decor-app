package com.roomdecor.service;

import com.roomdecor.dto.furniture.*;
import com.roomdecor.entity.Furniture;
import com.roomdecor.exception.ResourceNotFoundException;
import com.roomdecor.repository.FurnitureRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FurnitureServiceTest {
    @Mock FurnitureRepository repository;
    @InjectMocks FurnitureService service;
    private FurnitureRequest request() {
        return new FurnitureRequest(" Sofa ", " seating ", 2.0, 0.8, 0.9,
            "https://example.com/sofa.glb", "/files/sofa.jpg");
    }
    @Test void createStoresDimensionsAndAssetUrls() {
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));
        FurnitureDto dto = service.create(request());
        assertThat(dto.name()).isEqualTo("Sofa");
        assertThat(dto.category()).isEqualTo("seating");
        assertThat(dto.width()).isEqualTo(2.0);
        assertThat(dto.modelUrl()).isEqualTo(request().modelUrl());
        assertThat(dto.thumbnailUrl()).isEqualTo(request().thumbnailUrl());
    }
    @Test void updateRetainsId() {
        UUID id = UUID.randomUUID();
        when(repository.findById(id)).thenReturn(Optional.of(Furniture.builder().id(id).build()));
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));
        assertThat(service.update(id, request()).id()).isEqualTo(id);
    }
    @Test void missingFurnitureCannotBeUpdatedOrDeleted() {
        UUID id = UUID.randomUUID();
        when(repository.findById(id)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.update(id, request())).isInstanceOf(ResourceNotFoundException.class);
        assertThatThrownBy(() -> service.delete(id)).isInstanceOf(ResourceNotFoundException.class);
        verify(repository, never()).delete(any());
    }
    @Test void deleteChecksDatabaseReferences() {
        UUID id = UUID.randomUUID();
        Furniture item = Furniture.builder().id(id).build();
        when(repository.findById(id)).thenReturn(Optional.of(item));
        doThrow(new DataIntegrityViolationException("referenced")).when(repository).flush();
        assertThatThrownBy(() -> service.delete(id)).isInstanceOf(DataIntegrityViolationException.class);
        verify(repository).delete(item);
    }
    @Test void unusedFurnitureCanBeDeleted() {
        UUID id = UUID.randomUUID();
        Furniture item = Furniture.builder().id(id).build();
        when(repository.findById(id)).thenReturn(Optional.of(item));
        service.delete(id);
        verify(repository).delete(item);
        verify(repository).flush();
    }
}
