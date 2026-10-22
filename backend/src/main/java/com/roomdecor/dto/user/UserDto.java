package com.roomdecor.dto.user;

import java.util.UUID;

public record UserDto(
    UUID id,
    String name,
    String email
) {}
