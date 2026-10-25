package com.roomdecor.dto.auth;

import com.roomdecor.dto.user.UserDto;

public record AuthResponse(
    String token,
    UserDto user
) {}
