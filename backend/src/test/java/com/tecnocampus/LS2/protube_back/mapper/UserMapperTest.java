package com.tecnocampus.LS2.protube_back.mapper;

import com.tecnocampus.LS2.protube_back.model.User;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.*;

class UserMapperTest {
    private final UserMapper mapper = new UserMapper();

    @Test
    void mapsPublicProfileFields() {
        var user = new User();
        var createdAt = Instant.parse("2026-10-18T10:00:00Z");
        user.setId(42L);
        user.setEmail("private@example.com");
        user.setPasswordHash("private-test-hash");
        user.setDisplayName("Example user");
        user.setAvatarPath("avatars/example.webp");
        user.setDescription("Example profile");
        user.setCreatedAt(createdAt);

        var response = mapper.toResponse(user);

        assertAll(
                () -> assertEquals(42L, response.id()),
                () -> assertEquals("Example user", response.displayName()),
                () -> assertEquals("avatars/example.webp", response.avatarPath()),
                () -> assertEquals("Example profile", response.description()),
                () -> assertEquals(createdAt, response.createdAt())
        );
    }

    @Test
    void preservesMissingAvatar() {
        var user = new User();
        user.setDisplayName("User without avatar");
        user.setAvatarPath(null);

        var response = mapper.toResponse(user);

        assertNull(response.avatarPath());
        assertEquals("User without avatar", response.displayName());
    }

    @Test
    void serializedProfileExcludesPrivateFields() throws Exception {
        var user = new User();
        user.setEmail("private@example.com");
        user.setPasswordHash("private-test-hash");
        user.setDisplayName("Public name");

        var jsonMapper = new ObjectMapper().findAndRegisterModules();
        var json = jsonMapper.readTree(jsonMapper.writeValueAsString(mapper.toResponse(user)));

        assertEquals("Public name", json.get("displayName").asText());
        assertEquals(5, json.size());
        assertFalse(json.has("email"));
        assertFalse(json.has("passwordHash"));
        assertFalse(json.has("password_hash"));
    }
}
