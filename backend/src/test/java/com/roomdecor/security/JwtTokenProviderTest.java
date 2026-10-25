package com.roomdecor.security;

import com.roomdecor.entity.Role;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.WeakKeyException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtTokenProviderTest {

    private static final String SECRET = "test-secret-key-that-is-long-enough-for-hmac-sha";
    private static final long ONE_HOUR_MS = 3_600_000L;

    private JwtTokenProvider tokenProvider;

    @BeforeEach
    void setUp() {
        tokenProvider = new JwtTokenProvider(SECRET, ONE_HOUR_MS);
    }

    @Test
    void generatedTokenContainsUserIdAndRole() {
        UUID userId = UUID.randomUUID();

        String token = tokenProvider.generateToken(userId, "admin@example.com", Role.ADMIN);

        assertThat(tokenProvider.validateToken(token)).isTrue();
        assertThat(tokenProvider.getUserIdFromToken(token)).isEqualTo(userId);
        assertThat(tokenProvider.getRoleFromToken(token)).isEqualTo(Role.ADMIN);
    }

    @Test
    void tokenWithoutRoleClaimIsTreatedAsUser() {
        // Simulates a token issued before roles were added
        String legacyToken = Jwts.builder()
            .subject(UUID.randomUUID().toString())
            .issuedAt(new Date())
            .expiration(new Date(System.currentTimeMillis() + ONE_HOUR_MS))
            .signWith(Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8)))
            .compact();

        assertThat(tokenProvider.getRoleFromToken(legacyToken)).isEqualTo(Role.USER);
    }

    @Test
    void expiredTokenIsRejected() {
        JwtTokenProvider expiredProvider = new JwtTokenProvider(SECRET, -1000L);
        String token = expiredProvider.generateToken(UUID.randomUUID(), "a@example.com", Role.USER);

        assertThat(tokenProvider.validateToken(token)).isFalse();
    }

    @Test
    void tokenSignedWithAnotherKeyIsRejected() {
        JwtTokenProvider otherProvider =
            new JwtTokenProvider("another-secret-key-that-is-also-long-enough-123", ONE_HOUR_MS);
        String token = otherProvider.generateToken(UUID.randomUUID(), "a@example.com", Role.ADMIN);

        assertThat(tokenProvider.validateToken(token)).isFalse();
    }

    @Test
    void tamperedTokenIsRejected() {
        String token = tokenProvider.generateToken(UUID.randomUUID(), "a@example.com", Role.USER);
        String[] parts = token.split("\\.");
        // Swap the payload for one claiming ADMIN while keeping the original signature
        String forgedPayload = java.util.Base64.getUrlEncoder().withoutPadding()
            .encodeToString("{\"sub\":\"x\",\"role\":\"ADMIN\"}".getBytes(StandardCharsets.UTF_8));
        String forged = parts[0] + "." + forgedPayload + "." + parts[2];

        assertThat(tokenProvider.validateToken(forged)).isFalse();
    }

    @Test
    void malformedOrEmptyTokenIsRejected() {
        assertThat(tokenProvider.validateToken("not-a-jwt")).isFalse();
        assertThat(tokenProvider.validateToken("")).isFalse();
        assertThat(tokenProvider.validateToken(null)).isFalse();
    }

    @Test
    void secretShorterThan32BytesIsRefusedAtStartup() {
        assertThatThrownBy(() -> new JwtTokenProvider("too-short", ONE_HOUR_MS))
            .isInstanceOf(WeakKeyException.class);
    }
}
