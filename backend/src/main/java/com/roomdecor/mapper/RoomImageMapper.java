package com.roomdecor.mapper;

import com.roomdecor.dto.roomimage.RoomImageDto;
import com.roomdecor.entity.RoomImage;

public final class RoomImageMapper {
    private RoomImageMapper() {}

    public static RoomImageDto toDto(RoomImage image) {
        return new RoomImageDto(image.getId(), image.getUrl(), image.getWidth(), image.getHeight(), image.getCapturedAt());
    }
}
