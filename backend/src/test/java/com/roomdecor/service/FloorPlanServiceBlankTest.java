package com.roomdecor.service;

import com.roomdecor.dto.floorplan.CreateBlankRoomRequest;
import com.roomdecor.dto.floorplan.FloorPlanDto;
import com.roomdecor.dto.floorplan.OpeningDto;
import com.roomdecor.dto.floorplan.WallDto;
import com.roomdecor.entity.FloorPlan;
import com.roomdecor.entity.RoomImage;
import com.roomdecor.entity.User;
import com.roomdecor.exception.BadRequestException;
import com.roomdecor.repository.FloorPlanRepository;
import com.roomdecor.repository.RoomImageRepository;
import com.roomdecor.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FloorPlanServiceBlankTest {

    @Mock private FloorPlanRepository floorPlanRepository;
    @Mock private RoomImageRepository roomImageRepository;
    @Mock private UserRepository userRepository;

    private FloorPlanService service;
    private final User user = User.builder().id(UUID.randomUUID()).name("A").email("a@example.com").build();

    @BeforeEach
    void setUp() {
        service = new FloorPlanService(floorPlanRepository, roomImageRepository, userRepository);
    }

    private void stubSaves() {
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(roomImageRepository.save(any(RoomImage.class))).thenAnswer(inv -> {
            RoomImage img = inv.getArgument(0);
            img.setId(UUID.randomUUID());
            return img;
        });
        when(floorPlanRepository.saveAndFlush(any(FloorPlan.class))).thenAnswer(inv -> {
            FloorPlan fp = inv.getArgument(0);
            fp.setId(UUID.randomUUID());
            return fp;
        });
    }

    @Test
    void blankRectangleWithoutWallsCreatesBlankImageAndRectangle() {
        stubSaves();

        FloorPlanDto dto = service.createBlank(
            new CreateBlankRoomRequest(4.0, 3.0, null, null, null, null), user.getId());

        ArgumentCaptor<RoomImage> image = ArgumentCaptor.forClass(RoomImage.class);
        verify(roomImageRepository).save(image.capture());
        assertThat(image.getValue().getSource()).isEqualTo(RoomImage.SOURCE_BLANK);
        assertThat(image.getValue().getUser()).isEqualTo(user);

        assertThat(dto.source()).isEqualTo(RoomImage.SOURCE_BLANK);
        assertThat(dto.roomWidth()).isEqualTo(4.0);
        assertThat(dto.roomDepth()).isEqualTo(3.0);
        assertThat(dto.ceilingHeight()).isEqualTo(2.7);
        assertThat(dto.walls()).hasSize(4);
        assertThat(dto.description()).isEqualTo(FloorPlanService.BLANK_DESCRIPTION);
    }

    @Test
    void lShapeWithOpeningsKeepsPolygonAndComputesBounds() {
        stubSaves();
        List<WallDto> walls = List.of(
            new WallDto(0, 0, 5, 0), new WallDto(5, 0, 5, 2), new WallDto(5, 2, 3, 2),
            new WallDto(3, 2, 3, 4), new WallDto(3, 4, 0, 4), new WallDto(0, 4, 0, 0));
        List<OpeningDto> openings = List.of(
            new OpeningDto("door", 0.5, 4, 1.4, 4), new OpeningDto("window", 1, 0, 2.2, 0));

        FloorPlanDto dto = service.createBlank(
            new CreateBlankRoomRequest(9.0, 9.0, 3.0, walls, openings, "Phong khach"), user.getId());

        assertThat(dto.walls()).hasSize(6);
        assertThat(dto.roomWidth()).isEqualTo(5.0);  // from the walls, not the request
        assertThat(dto.roomDepth()).isEqualTo(4.0);
        assertThat(dto.ceilingHeight()).isEqualTo(3.0);
        assertThat(dto.openings()).extracting(OpeningDto::type).containsExactly("door", "window");
        assertThat(dto.description()).isEqualTo("Phong khach");
    }

    @Test
    void rejectsUnknownOpeningType() {
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        CreateBlankRoomRequest req = new CreateBlankRoomRequest(4.0, 4.0, null, null,
            List.of(new OpeningDto("stairs", 0, 0, 1, 0)), null);

        assertThatThrownBy(() -> service.createBlank(req, user.getId())).isInstanceOf(BadRequestException.class);
        verify(roomImageRepository, never()).save(any());
    }

    @Test
    void rejectsFewerThanThreeWalls() {
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        CreateBlankRoomRequest req = new CreateBlankRoomRequest(4.0, 4.0, null,
            List.of(new WallDto(0, 0, 4, 0), new WallDto(4, 0, 4, 4)), null, null);

        assertThatThrownBy(() -> service.createBlank(req, user.getId())).isInstanceOf(BadRequestException.class);
        verify(roomImageRepository, never()).save(any());
    }
}
