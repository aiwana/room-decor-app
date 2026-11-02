package com.roomdecor.controller;

import com.roomdecor.config.SecurityConfig;
import com.roomdecor.dto.furniture.FurnitureDto;
import com.roomdecor.entity.Role;
import com.roomdecor.exception.ConflictException;
import com.roomdecor.security.JwtAuthenticationFilter;
import com.roomdecor.security.JwtTokenProvider;
import com.roomdecor.security.RestAccessDeniedHandler;
import com.roomdecor.security.RestAuthenticationEntryPoint;
import com.roomdecor.service.FurnitureService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Web layer + real SecurityConfig: checks who may call the admin catalog API and the JSON error shape.
 * The JWT provider is mocked so each token string maps to a role.
 */
@WebMvcTest(controllers = {AdminFurnitureController.class, FurnitureController.class})
@Import({SecurityConfig.class, JwtAuthenticationFilter.class,
    RestAuthenticationEntryPoint.class, RestAccessDeniedHandler.class})
class AdminFurnitureSecurityTest {

    private static final String BODY = """
        {"name":"Ghế đôn","category":"chair","width":40,"height":45,"depth":40}
        """;

    @Autowired private MockMvc mvc;
    @MockitoBean private FurnitureService furnitureService;
    @MockitoBean private JwtTokenProvider tokenProvider;

    @BeforeEach
    void tokens() {
        when(tokenProvider.validateToken("admin-token")).thenReturn(true);
        when(tokenProvider.getUserIdFromToken("admin-token")).thenReturn(UUID.randomUUID());
        when(tokenProvider.getRoleFromToken("admin-token")).thenReturn(Role.ADMIN);
        when(tokenProvider.validateToken("user-token")).thenReturn(true);
        when(tokenProvider.getUserIdFromToken("user-token")).thenReturn(UUID.randomUUID());
        when(tokenProvider.getRoleFromToken("user-token")).thenReturn(Role.USER);
    }

    @Test
    void noTokenGets401() throws Exception {
        mvc.perform(post("/api/admin/furniture").contentType(MediaType.APPLICATION_JSON).content(BODY))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.status").value(401));
        verifyNoInteractions(furnitureService);
    }

    @Test
    void userRoleGets403() throws Exception {
        mvc.perform(post("/api/admin/furniture").header("Authorization", "Bearer user-token")
                .contentType(MediaType.APPLICATION_JSON).content(BODY))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.status").value(403));
        verifyNoInteractions(furnitureService);
    }

    @Test
    void adminCanCreate() throws Exception {
        when(furnitureService.create(any())).thenReturn(dto("Ghế đôn"));

        mvc.perform(post("/api/admin/furniture").header("Authorization", "Bearer admin-token")
                .contentType(MediaType.APPLICATION_JSON).content(BODY))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.name").value("Ghế đôn"));
    }

    @Test
    void invalidBodyGets400WithFieldErrors() throws Exception {
        mvc.perform(post("/api/admin/furniture").header("Authorization", "Bearer admin-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"\",\"category\":\"chair\",\"width\":-1,\"height\":45,\"depth\":40}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.errors.name").exists())
            .andExpect(jsonPath("$.errors.width").exists());
        verifyNoInteractions(furnitureService);
    }

    @Test
    void deletingUsedItemGets409() throws Exception {
        UUID id = UUID.randomUUID();
        doThrow(new ConflictException("Furniture is used in saved designs and cannot be deleted"))
            .when(furnitureService).delete(id);

        mvc.perform(delete("/api/admin/furniture/" + id).header("Authorization", "Bearer admin-token"))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.status").value(409));
    }

    @Test
    void adminCanDeleteUnusedItem() throws Exception {
        UUID id = UUID.randomUUID();
        mvc.perform(delete("/api/admin/furniture/" + id).header("Authorization", "Bearer admin-token"))
            .andExpect(status().isNoContent());
        verify(furnitureService).delete(id);
    }

    @Test
    void normalUserCanStillReadCatalog() throws Exception {
        mvc.perform(get("/api/furniture").header("Authorization", "Bearer user-token"))
            .andExpect(status().isOk());
    }

    private static FurnitureDto dto(String name) {
        return new FurnitureDto(UUID.randomUUID(), name, "chair", 40.0, 45.0, 40.0,
            null, null, null, null, null, "VND", null, null, "in_stock");
    }
}
