package com.roomdecor.controller;

import com.roomdecor.config.SecurityConfig;
import com.roomdecor.security.*;
import com.roomdecor.service.*;
import com.roomdecor.dto.design.DesignDto;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest({FurnitureController.class, DesignController.class})
@Import({SecurityConfig.class, JwtAuthenticationFilter.class,
    RestAuthenticationEntryPoint.class, RestAccessDeniedHandler.class})
class CatalogDesignApiTest {
    @Autowired MockMvc mvc;
    @MockBean FurnitureService furnitureService;
    @MockBean DesignService designService;
    @MockBean JwtTokenProvider tokenProvider;

    private static final String VALID = """
        {"name":"Sofa","category":"sofa","width":200,"height":80,"depth":90,
         "modelUrl":"https://example.com/sofa.glb","thumbnailUrl":"/files/sofa.jpg"}
        """;

    @Test void anonymousCannotReadCatalog() throws Exception {
        mvc.perform(get("/api/furniture")).andExpect(status().isUnauthorized());
    }
    @Test void regularUserCannotWriteCatalog() throws Exception {
        mvc.perform(post("/api/furniture").with(user("user").roles("USER"))
            .contentType("application/json").content(VALID)).andExpect(status().isForbidden());
        mvc.perform(put("/api/furniture/" + UUID.randomUUID()).with(user("user").roles("USER"))
            .contentType("application/json").content(VALID)).andExpect(status().isForbidden());
        mvc.perform(delete("/api/furniture/" + UUID.randomUUID()).with(user("user").roles("USER")))
            .andExpect(status().isForbidden());
        verifyNoInteractions(furnitureService);
    }
    @Test void adminCanWriteCatalog() throws Exception {
        mvc.perform(post("/api/furniture").with(user("admin").roles("ADMIN"))
            .contentType("application/json").content(VALID)).andExpect(status().isCreated());
        mvc.perform(put("/api/furniture/" + UUID.randomUUID()).with(user("admin").roles("ADMIN"))
            .contentType("application/json").content(VALID)).andExpect(status().isOk());
        mvc.perform(delete("/api/furniture/" + UUID.randomUUID()).with(user("admin").roles("ADMIN")))
            .andExpect(status().isNoContent());
    }
    @Test void invalidDimensionsAndAssetUrlRejected() throws Exception {
        mvc.perform(post("/api/furniture").with(user("admin").roles("ADMIN"))
            .contentType("application/json").content(VALID.replace("200", "-1")))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("errors.width").exists());
        mvc.perform(post("/api/furniture").with(user("admin").roles("ADMIN"))
            .contentType("application/json").content(VALID.replace("https://example.com/sofa.glb", "javascript:alert(1)")))
            .andExpect(status().isBadRequest());
        verifyNoInteractions(furnitureService);
    }
    @Test void nestedPlacementsAndBlankNameValidated() throws Exception {
        var auth = new UsernamePasswordAuthenticationToken(UUID.randomUUID(), null,
            List.of(new SimpleGrantedAuthority("ROLE_USER")));
        mvc.perform(put("/api/designs/" + UUID.randomUUID()).with(authentication(auth))
            .contentType("application/json").content("{\"name\":\"   \"}"))
            .andExpect(status().isBadRequest());
        mvc.perform(put("/api/designs/" + UUID.randomUUID()).with(authentication(auth))
            .contentType("application/json").content("{\"placements\":[{\"scale\":0}]}"))
            .andExpect(status().isBadRequest());
        verifyNoInteractions(designService);
    }
    @Test void sceneRoundTripsThroughHttp() throws Exception {
        UUID owner = UUID.randomUUID();
        UUID id = UUID.randomUUID();
        var scene = new com.fasterxml.jackson.databind.ObjectMapper().readTree("{\"version\":1,\"objects\":[]}");
        var dto = new DesignDto(id, "Room", null, List.of(), null, null, scene, "/files/preview.jpg");
        when(designService.create(any(), eq(owner))).thenReturn(dto);
        when(designService.getById(id, owner)).thenReturn(dto);
        var auth = new UsernamePasswordAuthenticationToken(owner, null, List.of(new SimpleGrantedAuthority("ROLE_USER")));
        mvc.perform(post("/api/designs").with(authentication(auth)).contentType("application/json")
            .content("{\"name\":\"Room\",\"sceneJson\":{\"version\":1,\"objects\":[]}}"))
            .andExpect(status().isOk()).andExpect(jsonPath("sceneJson.version").value(1));
        mvc.perform(get("/api/designs/" + id).with(authentication(auth)))
            .andExpect(status().isOk()).andExpect(jsonPath("sceneJson.objects").isArray());
        verify(designService).create(argThat(r -> r.sceneJson().equals(scene)), eq(owner));
    }
}
