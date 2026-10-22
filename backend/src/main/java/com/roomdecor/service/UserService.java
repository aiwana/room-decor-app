package com.roomdecor.service;

import com.roomdecor.dto.user.UserDto;
import com.roomdecor.entity.User;
import com.roomdecor.exception.ResourceNotFoundException;
import com.roomdecor.mapper.UserMapper;
import com.roomdecor.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public UserDto getProfile(UUID userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return UserMapper.toDto(user);
    }
}
