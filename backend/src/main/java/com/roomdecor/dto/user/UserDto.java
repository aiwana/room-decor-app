package com.roomdecor.dto.user;

import com.roomdecor.entity.Role;

import java.util.UUID;

public record UserDto(
    UUID id,
    String name,
    String email,
    Role role
) {}
