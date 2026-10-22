package com.roomdecor.service;

import com.roomdecor.dto.auth.AuthResponse;
import com.roomdecor.dto.auth.LoginRequest;
import com.roomdecor.dto.auth.RegisterRequest;
import com.roomdecor.entity.Role;
import com.roomdecor.entity.User;
import com.roomdecor.exception.BadRequestException;
import com.roomdecor.repository.UserRepository;
import com.roomdecor.security.JwtTokenProvider;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtTokenProvider tokenProvider;

    @InjectMocks
    private AuthService authService;

    @Test
    void registerSavesUserWithHashedPasswordAndUserRole() {
        UUID newId = UUID.randomUUID();
        RegisterRequest request = new RegisterRequest("Nguyen Van A", "a@example.com", "secret123");
        when(userRepository.existsByEmail("a@example.com")).thenReturn(false);
        when(passwordEncoder.encode("secret123")).thenReturn("hashed-password");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User saved = invocation.getArgument(0);
            saved.setId(newId);
            return saved;
        });
        when(tokenProvider.generateToken(newId, "a@example.com", Role.USER)).thenReturn("jwt-token");

        AuthResponse response = authService.register(request);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        User saved = captor.getValue();
        assertThat(saved.getPassword()).isEqualTo("hashed-password");
        assertThat(saved.getRole()).isEqualTo(Role.USER);

        assertThat(response.token()).isEqualTo("jwt-token");
        assertThat(response.user().id()).isEqualTo(newId);
        assertThat(response.user().email()).isEqualTo("a@example.com");
        assertThat(response.user().role()).isEqualTo(Role.USER);
    }

    @Test
    void registerRejectsEmailThatIsAlreadyUsed() {
        RegisterRequest request = new RegisterRequest("B", "taken@example.com", "secret123");
        when(userRepository.existsByEmail("taken@example.com")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(request))
            .isInstanceOf(BadRequestException.class)
            .hasMessage("Email already registered");
        verify(userRepository, never()).save(any());
    }

    @Test
    void loginReturnsTokenCarryingTheStoredRole() {
        User admin = user(Role.ADMIN);
        when(userRepository.findByEmail("a@example.com")).thenReturn(Optional.of(admin));
        when(passwordEncoder.matches("secret123", "hashed-password")).thenReturn(true);
        when(tokenProvider.generateToken(admin.getId(), "a@example.com", Role.ADMIN)).thenReturn("admin-token");

        AuthResponse response = authService.login(new LoginRequest("a@example.com", "secret123"));

        assertThat(response.token()).isEqualTo("admin-token");
        assertThat(response.user().role()).isEqualTo(Role.ADMIN);
    }

    @Test
    void loginWithUnknownEmailFailsWithGenericMessage() {
        when(userRepository.findByEmail("nobody@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(new LoginRequest("nobody@example.com", "secret123")))
            .isInstanceOf(BadRequestException.class)
            .hasMessage("Invalid email or password");
    }

    @Test
    void loginWithWrongPasswordFailsWithSameMessageAndIssuesNoToken() {
        when(userRepository.findByEmail("a@example.com")).thenReturn(Optional.of(user(Role.USER)));
        when(passwordEncoder.matches("wrong-pass", "hashed-password")).thenReturn(false);

        assertThatThrownBy(() -> authService.login(new LoginRequest("a@example.com", "wrong-pass")))
            .isInstanceOf(BadRequestException.class)
            .hasMessage("Invalid email or password");
        verify(tokenProvider, never()).generateToken(any(), any(), any());
    }

    private static User user(Role role) {
        return User.builder()
            .id(UUID.randomUUID())
            .name("Nguyen Van A")
            .email("a@example.com")
            .password("hashed-password")
            .role(role)
            .build();
    }
}
