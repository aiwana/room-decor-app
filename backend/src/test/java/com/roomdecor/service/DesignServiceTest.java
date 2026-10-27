package com.roomdecor.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.roomdecor.dto.design.*;
import com.roomdecor.entity.*;
import com.roomdecor.exception.*;
import com.roomdecor.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DesignServiceTest {
    @Mock DesignRepository designRepository;
    @Mock UserRepository userRepository;
    @Mock RoomImageRepository roomImageRepository;
    @Mock FurnitureRepository furnitureRepository;
    @InjectMocks DesignService service;
    private final UUID ownerId = UUID.randomUUID();
    private final UUID designId = UUID.randomUUID();

    private Design design() {
        return Design.builder().id(designId).name("Room")
            .user(User.builder().id(ownerId).build()).build();
    }

    @Test void createWithoutPhotoPersistsSceneAndPreview() throws Exception {
        var scene = new ObjectMapper().readTree("{\"version\":1,\"objects\":[],\"room\":{\"width\":4}}");
        when(userRepository.findById(ownerId)).thenReturn(Optional.of(User.builder().id(ownerId).build()));
        when(designRepository.saveAndFlush(any())).thenAnswer(i -> i.getArgument(0));
        var dto = service.create(new CreateDesignRequest(" Room ", null, scene, "/files/preview.jpg", null), ownerId);
        assertThat(dto.name()).isEqualTo("Room");
        assertThat(dto.sceneJson()).isEqualTo(scene);
        assertThat(dto.previewImageUrl()).isEqualTo("/files/preview.jpg");
        assertThat(dto.roomImageId()).isNull();
        verifyNoInteractions(roomImageRepository);
    }

    @Test void cannotCreateUsingAnotherUsersPhoto() {
        UUID photoId = UUID.randomUUID();
        when(userRepository.findById(ownerId)).thenReturn(Optional.of(User.builder().id(ownerId).build()));
        when(roomImageRepository.findById(photoId)).thenReturn(Optional.of(RoomImage.builder()
            .user(User.builder().id(UUID.randomUUID()).build()).build()));
        assertThatThrownBy(() -> service.create(new CreateDesignRequest("Room", photoId, null, null, null), ownerId))
            .isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(designRepository);
    }

    @Test void ownerCanLoadSavedScene() throws Exception {
        Design design = design();
        design.setSceneJson(new ObjectMapper().readTree("{\"objects\":[{\"position\":[1,2,3]}]}"));
        when(designRepository.findById(designId)).thenReturn(Optional.of(design));
        assertThat(service.getById(designId, ownerId).sceneJson()).isEqualTo(design.getSceneJson());
    }

    @Test void otherUsersCannotReadUpdateOrDelete() {
        when(designRepository.findById(designId)).thenReturn(Optional.of(design()));
        UUID stranger = UUID.randomUUID();
        assertThatThrownBy(() -> service.getById(designId, stranger)).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.update(designId, new UpdateDesignRequest("Changed", null, null, null), stranger))
            .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.delete(designId, stranger)).isInstanceOf(AccessDeniedException.class);
        verify(designRepository, never()).delete(any());
        verify(designRepository, never()).saveAndFlush(any());
    }

    @Test void updateReplacesSceneAndPlacementsAndCanClearThem() throws Exception {
        Design design = design();
        design.getPlacements().add(FurniturePlacement.builder().build());
        UUID furnitureId = UUID.randomUUID();
        when(designRepository.findById(designId)).thenReturn(Optional.of(design));
        when(designRepository.saveAndFlush(any())).thenAnswer(i -> i.getArgument(0));
        when(furnitureRepository.findById(furnitureId)).thenReturn(Optional.of(Furniture.builder().id(furnitureId).build()));
        var scene = new ObjectMapper().readTree("{\"version\":1,\"objects\":[]}");
        var dto = service.update(designId, new UpdateDesignRequest(null,
            List.of(new PlacementDto(null, furnitureId, 1.0, 2.0, 90.0, 1.0)), scene, null), ownerId);
        assertThat(dto.name()).isEqualTo("Room");
        assertThat(dto.sceneJson()).isEqualTo(scene);
        assertThat(dto.placements()).hasSize(1);
        assertThat(dto.placements().get(0).furnitureId()).isEqualTo(furnitureId);
        assertThat(design.getPlacements().get(0).getDesign()).isSameAs(design);
        assertThat(service.update(designId, new UpdateDesignRequest(null, List.of(), null, null), ownerId).placements()).isEmpty();
        assertThat(design.getSceneJson()).isEqualTo(scene);
    }

    @Test void malformedSceneRejectedBeforeSaving() throws Exception {
        when(designRepository.findById(designId)).thenReturn(Optional.of(design()));
        var scene = new ObjectMapper().readTree("[]");
        assertThatThrownBy(() -> service.update(designId, new UpdateDesignRequest(null, null, scene, null), ownerId))
            .isInstanceOf(BadRequestException.class);
        verify(designRepository, never()).saveAndFlush(any());
    }

    @Test void explicitJsonNullKeepsExistingScene() throws Exception {
        Design design = design();
        var mapper = new ObjectMapper();
        design.setSceneJson(mapper.readTree("{\"version\":1}"));
        when(designRepository.findById(designId)).thenReturn(Optional.of(design));
        when(designRepository.saveAndFlush(any())).thenAnswer(i -> i.getArgument(0));
        var request = mapper.readValue("{\"sceneJson\":null}", UpdateDesignRequest.class);
        assertThat(service.update(designId, request, ownerId).sceneJson()).isEqualTo(design.getSceneJson());
    }

    @Test void invalidPlacementDoesNotClearExistingPlacements() {
        Design design = design();
        design.getPlacements().add(FurniturePlacement.builder().build());
        when(designRepository.findById(designId)).thenReturn(Optional.of(design));
        assertThatThrownBy(() -> service.update(designId, new UpdateDesignRequest(null,
            List.of(new PlacementDto(null, UUID.randomUUID(), Double.NaN, 0.0, 0.0, 1.0)), null, null), ownerId))
            .isInstanceOf(BadRequestException.class);
        assertThat(design.getPlacements()).hasSize(1);
    }

    @Test void missingFurnitureRejected() {
        when(designRepository.findById(designId)).thenReturn(Optional.of(design()));
        UUID missing = UUID.randomUUID();
        when(furnitureRepository.findById(missing)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.update(designId, new UpdateDesignRequest(null,
            List.of(new PlacementDto(null, missing, 0.0, 0.0, 0.0, 1.0)), null, null), ownerId))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test void listsOnlyCurrentUsersDesigns() {
        when(designRepository.findByUserId(ownerId)).thenReturn(List.of(design()));
        assertThat(service.getByUserId(ownerId)).extracting(DesignDto::id).containsExactly(designId);
    }

    @Test void ownerCanDeleteAndUnknownDesignReturnsNotFound() {
        Design design = design();
        when(designRepository.findById(designId)).thenReturn(Optional.of(design));
        service.delete(designId, ownerId);
        verify(designRepository).delete(design);
        UUID missing = UUID.randomUUID();
        when(designRepository.findById(missing)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.getById(missing, ownerId)).isInstanceOf(ResourceNotFoundException.class);
    }
}
