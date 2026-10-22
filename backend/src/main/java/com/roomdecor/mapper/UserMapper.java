package com.roomdecor.mapper;

import com.roomdecor.dto.user.UserDto;
import com.roomdecor.entity.User;

public final class UserMapper {
    private UserMapper() {}

    public static UserDto toDto(User user) {
        return new UserDto(user.getId(), user.getName(), user.getEmail(), user.getRole());
    }
}
