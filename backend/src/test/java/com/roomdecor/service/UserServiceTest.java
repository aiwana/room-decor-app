package com.roomdecor.service;

import com.roomdecor.dto.user.UserDto;
import com.roomdecor.entity.Role;
import com.roomdecor.entity.User;
import com.roomdecor.exception.ResourceNotFoundException;
import com.roomdecor.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Sort;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserService userService;

    @Test
    void getProfileReturnsUserWithoutPassword() {
        User user = user("a@example.com", Role.USER);
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));

        UserDto dto = userService.getProfile(user.getId());

        assertThat(dto).isEqualTo(new UserDto(user.getId(), "Name", "a@example.com", Role.USER));
    }

    @Test
    void getProfileOfUnknownUserThrowsNotFound() {
        UUID unknownId = UUID.randomUUID();
        when(userRepository.findById(unknownId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.getProfile(unknownId))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessage("User not found");
    }

    @Test
    void listUsersReturnsAllUsersOrderedByCreationDate() {
        User admin = user("admin@example.com", Role.ADMIN);
        User normal = user("user@example.com", Role.USER);
        when(userRepository.findAll(Sort.by("createdAt"))).thenReturn(List.of(admin, normal));

        List<UserDto> users = userService.listUsers();

        assertThat(users).extracting(UserDto::email).containsExactly("admin@example.com", "user@example.com");
        assertThat(users).extracting(UserDto::role).containsExactly(Role.ADMIN, Role.USER);
    }

    private static User user(String email, Role role) {
        return User.builder()
            .id(UUID.randomUUID())
            .name("Name")
            .email(email)
            .password("hashed-password")
            .role(role)
            .build();
    }
}
