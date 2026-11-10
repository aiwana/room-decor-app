package com.roomdecor.service;

import com.roomdecor.dto.design.CreateDesignRequest;
import com.roomdecor.dto.design.DesignDto;
import com.roomdecor.dto.design.PlacementDto;
import com.roomdecor.dto.design.UpdateDesignRequest;
import com.roomdecor.entity.*;
import com.roomdecor.exception.ResourceNotFoundException;
import com.roomdecor.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DesignServiceTest {

    @Mock private DesignRepository designRepository;
    @Mock private UserRepository userRepository;
    @Mock private RoomImageRepository roomImageRepository;
    @Mock private FurnitureRepository furnitureRepository;

    @InjectMocks
    private DesignService designService;

    private final User owner = user();
    private final User stranger = user();

    @Test
    void createUsesOwnRoomImage() {
        RoomImage image = image(owner);
        when(userRepository.findById(owner.getId())).thenReturn(Optional.of(owner));
        when(roomImageRepository.findById(image.getId())).thenReturn(Optional.of(image));
        when(designRepository.save(any(Design.class))).thenAnswer(inv -> inv.getArgument(0));

        DesignDto dto = designService.create(new CreateDesignRequest("Phòng khách", image.getId()), owner.getId());

        assertThat(dto.name()).isEqualTo("Phòng khách");
        assertThat(dto.roomImageId()).isEqualTo(image.getId());
    }

    @Test
    void createDefaultsRoomTypeToOtherAndKeepsGivenType() {
        RoomImage image = image(owner);
        when(userRepository.findById(owner.getId())).thenReturn(Optional.of(owner));
        when(roomImageRepository.findById(image.getId())).thenReturn(Optional.of(image));
        when(designRepository.save(any(Design.class))).thenAnswer(inv -> inv.getArgument(0));

        assertThat(designService.create(new CreateDesignRequest("A", image.getId()), owner.getId()).roomType())
            .isEqualTo("other");
        assertThat(designService.create(new CreateDesignRequest("B", image.getId(), "bedroom"), owner.getId()).roomType())
            .isEqualTo("bedroom");
    }

    @Test
    void updateChangesRoomTypeOnlyWhenGiven() {
        Design design = design(owner);
        when(designRepository.findById(design.getId())).thenReturn(Optional.of(design));

        DesignDto changed = designService.update(design.getId(),
            new UpdateDesignRequest(null, null, null, null, null, "kitchen"), owner.getId());
        assertThat(changed.roomType()).isEqualTo("kitchen");

        DesignDto kept = designService.update(design.getId(),
            new UpdateDesignRequest("Tên khác", null, null, null, null), owner.getId());
        assertThat(kept.roomType()).isEqualTo("kitchen");
        assertThat(kept.name()).isEqualTo("Tên khác");
    }

    @Test
    void createWithSomeoneElsesRoomImageIsDenied() {
        RoomImage image = image(owner);
        when(userRepository.findById(stranger.getId())).thenReturn(Optional.of(stranger));
        when(roomImageRepository.findById(image.getId())).thenReturn(Optional.of(image));

        assertThatThrownBy(() -> designService.create(
            new CreateDesignRequest("Trộm ảnh", image.getId()), stranger.getId()))
            .isInstanceOf(AccessDeniedException.class);
        verify(designRepository, never()).save(any());
    }

    @Test
    void getByIdOfOtherUsersDesignIsDenied() {
        Design design = design(owner);
        when(designRepository.findById(design.getId())).thenReturn(Optional.of(design));

        assertThatThrownBy(() -> designService.getById(design.getId(), stranger.getId()))
            .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void getByIdOfUnknownDesignThrowsNotFound() {
        UUID id = UUID.randomUUID();
        when(designRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> designService.getById(id, owner.getId()))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void updateReplacesPlacementsAndMaterials() {
        Design design = design(owner);
        Furniture sofa = Furniture.builder().id(UUID.randomUUID()).name("Sofa").category("sofa")
            .width(200.0).height(80.0).depth(90.0).build();
        when(designRepository.findById(design.getId())).thenReturn(Optional.of(design));
        when(furnitureRepository.findById(sofa.getId())).thenReturn(Optional.of(sofa));

        DesignDto dto = designService.update(design.getId(), new UpdateDesignRequest(
            "Tên mới", "tile", null, null,
            List.of(new PlacementDto(null, sofa.getId(), 0.5, 0.4, 90.0, 1.0))), owner.getId());

        assertThat(dto.name()).isEqualTo("Tên mới");
        assertThat(dto.floorMaterial()).isEqualTo("tile");
        assertThat(dto.wallMaterial()).isEqualTo("white");
        assertThat(dto.placements()).singleElement()
            .satisfies(p -> {
                assertThat(p.furnitureId()).isEqualTo(sofa.getId());
                assertThat(p.rotation()).isEqualTo(90.0);
            });
    }

    @Test
    void updateWithUnknownFurnitureThrowsNotFound() {
        Design design = design(owner);
        UUID missing = UUID.randomUUID();
        when(designRepository.findById(design.getId())).thenReturn(Optional.of(design));
        when(furnitureRepository.findById(missing)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> designService.update(design.getId(), new UpdateDesignRequest(
            null, null, null, null, List.of(new PlacementDto(null, missing, 0.1, 0.1, 0.0, 1.0))),
            owner.getId()))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void updateOfOtherUsersDesignIsDenied() {
        Design design = design(owner);
        when(designRepository.findById(design.getId())).thenReturn(Optional.of(design));

        assertThatThrownBy(() -> designService.update(design.getId(),
            new UpdateDesignRequest("x", null, null, null, null), stranger.getId()))
            .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void deleteOwnDesign() {
        Design design = design(owner);
        when(designRepository.findById(design.getId())).thenReturn(Optional.of(design));

        designService.delete(design.getId(), owner.getId());

        verify(designRepository).delete(design);
    }

    @Test
    void deleteOtherUsersDesignIsDenied() {
        Design design = design(owner);
        when(designRepository.findById(design.getId())).thenReturn(Optional.of(design));

        assertThatThrownBy(() -> designService.delete(design.getId(), stranger.getId()))
            .isInstanceOf(AccessDeniedException.class);
        verify(designRepository, never()).delete(any());
    }

    private static User user() {
        return User.builder().id(UUID.randomUUID()).name("U").email(UUID.randomUUID() + "@example.com")
            .password("x").role(Role.USER).build();
    }

    private static RoomImage image(User user) {
        return RoomImage.builder().id(UUID.randomUUID()).user(user).url("http://x/a.jpg").build();
    }

    private static Design design(User user) {
        return Design.builder().id(UUID.randomUUID()).user(user).name("D").roomImage(image(user)).build();
    }
}
