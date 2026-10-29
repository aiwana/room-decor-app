package com.roomdecor.service;

import com.roomdecor.dto.ai.ScanRoomRequest;
import com.roomdecor.dto.ai.ScanRoomResponse;
import com.roomdecor.entity.FloorPlan;
import com.roomdecor.entity.RoomImage;
import com.roomdecor.entity.User;
import com.roomdecor.exception.BadRequestException;
import com.roomdecor.repository.FloorPlanRepository;
import com.roomdecor.repository.RoomImageRepository;
import com.roomdecor.service.ai.MockVisionClient;
import com.roomdecor.service.ai.RoomVisionClient;
import com.roomdecor.storage.StorageService;
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
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AiServiceTest {

    @Mock private RoomImageRepository roomImageRepository;
    @Mock private FloorPlanRepository floorPlanRepository;
    @Mock private FloorPlanService floorPlanService;
    @Mock private StorageService storageService;

    private RoomVisionClient visionClient;
    private AiService aiService;

    private final User owner = user();
    private final User stranger = user();

    @BeforeEach
    void setUp() {
        visionClient = spy(new MockVisionClient());
        aiService = new AiService(roomImageRepository, floorPlanRepository, floorPlanService, visionClient, storageService);
    }

    @Test
    void scanSendsMainAndExtraPhotosInOrderAndSavesExtraIds() {
        RoomImage main = image(owner);
        RoomImage corner2 = image(owner);
        RoomImage corner3 = image(owner);
        stubImages(main, corner2, corner3);
        when(floorPlanRepository.findByRoomImageId(main.getId())).thenReturn(Optional.empty());
        when(floorPlanService.createFromScan(eq(main), any(), any(), anyInt()))
            .thenAnswer(inv -> floorPlan(main));

        // corner2 twice and the main photo again: duplicates must be ignored
        ScanRoomRequest request = new ScanRoomRequest(main.getId(),
            List.of(corner2.getId(), main.getId(), corner3.getId(), corner2.getId()), 3.2);
        ScanRoomResponse response = aiService.scanRoom(request, owner.getId());

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<RoomVisionClient.ImageInput>> images = ArgumentCaptor.forClass(List.class);
        ArgumentCaptor<RoomVisionClient.ScanHints> hints = ArgumentCaptor.forClass(RoomVisionClient.ScanHints.class);
        verify(visionClient).analyze(images.capture(), hints.capture());
        assertThat(images.getValue()).extracting(RoomVisionClient.ImageInput::url)
            .containsExactly(main.getUrl(), corner2.getUrl(), corner3.getUrl());
        assertThat(hints.getValue().referenceLengthMeters()).isEqualTo(3.2);

        verify(floorPlanService).createFromScan(eq(main), eq(List.of(corner2.getId(), corner3.getId())), any(), anyInt());
        assertThat(response.floorPlan().roomImageId()).isEqualTo(main.getId());
    }

    @Test
    void scanRejectsExtraPhotoOfAnotherUser() {
        RoomImage main = image(owner);
        RoomImage foreign = image(stranger);
        when(roomImageRepository.findById(main.getId())).thenReturn(Optional.of(main));
        when(roomImageRepository.findById(foreign.getId())).thenReturn(Optional.of(foreign));

        ScanRoomRequest request = new ScanRoomRequest(main.getId(), List.of(foreign.getId()), null);

        assertThatThrownBy(() -> aiService.scanRoom(request, owner.getId()))
            .isInstanceOf(BadRequestException.class)
            .hasMessage("Access denied to this room image");
        verify(visionClient, never()).analyze(any(), any());
        verify(floorPlanRepository, never()).delete(any());
    }

    @Test
    void scanRejectsPhotosThatAreTooLargeTogether() {
        RoomImage main = image(owner);
        RoomImage corner2 = image(owner);
        when(roomImageRepository.findById(main.getId())).thenReturn(Optional.of(main));
        when(roomImageRepository.findById(corner2.getId())).thenReturn(Optional.of(corner2));
        byte[] big = new byte[(int) (AiService.MAX_TOTAL_IMAGE_BYTES / 2 + 1)];
        when(storageService.readImageBytes(anyString())).thenReturn(big);
        when(storageService.imageMimeType(anyString())).thenReturn("image/jpeg");

        ScanRoomRequest request = new ScanRoomRequest(main.getId(), List.of(corner2.getId()), null);

        assertThatThrownBy(() -> aiService.scanRoom(request, owner.getId()))
            .isInstanceOf(BadRequestException.class)
            .hasMessageContaining("too large");
        verify(visionClient, never()).analyze(any(), any());
    }

    @Test
    void scanWithOnlyMainPhotoStillWorks() {
        RoomImage main = image(owner);
        stubImages(main);
        when(floorPlanRepository.findByRoomImageId(main.getId())).thenReturn(Optional.empty());
        when(floorPlanService.createFromScan(eq(main), any(), any(), anyInt()))
            .thenAnswer(inv -> floorPlan(main));

        aiService.scanRoom(new ScanRoomRequest(main.getId(), null, null), owner.getId());

        verify(floorPlanService).createFromScan(eq(main), eq(List.of()), any(), anyInt());
    }

    private void stubImages(RoomImage... images) {
        for (RoomImage image : images) {
            when(roomImageRepository.findById(image.getId())).thenReturn(Optional.of(image));
            when(storageService.readImageBytes(image.getUrl())).thenReturn(new byte[] {1, 2, 3});
            when(storageService.imageMimeType(image.getUrl())).thenReturn("image/jpeg");
        }
    }

    private static FloorPlan floorPlan(RoomImage image) {
        return FloorPlan.builder()
            .id(UUID.randomUUID())
            .roomImage(image)
            .roomWidth(4.0).roomDepth(4.0).ceilingHeight(2.7)
            .walls(FloorPlanGeometry.rectangleWalls(4, 4))
            .pixelsPerMeter(100)
            .build();
    }

    private static RoomImage image(User user) {
        UUID id = UUID.randomUUID();
        return RoomImage.builder()
            .id(id)
            .user(user)
            .url("http://localhost:8080/files/rooms/" + id + ".jpg")
            .build();
    }

    private static User user() {
        return User.builder().id(UUID.randomUUID()).name("Name").email(UUID.randomUUID() + "@example.com").build();
    }
}
