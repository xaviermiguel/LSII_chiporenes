package com.tecnocampus.LS2.protube_back.repository;

import com.tecnocampus.LS2.protube_back.model.User;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest(properties = {
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect"
})
@ActiveProfiles("test")
class UserRepositoryTest {
    @Autowired UserRepository repository;
    @Autowired TestEntityManager entityManager;

    @Test
    void savesAndReadsUserFromDatabase() {
        var user = new User();
        user.setEmail("user@example.com");
        user.setPasswordHash("example-stored-hash");
        user.setDisplayName("Example user");
        user.setAvatarPath("avatars/example.webp");
        user.setDescription("Example profile");
        user.setCreatedAt(Instant.parse("2026-10-14T10:00:00Z"));

        var saved = repository.saveAndFlush(user);
        assertNotNull(saved.getId());
        entityManager.clear();

        var loaded = repository.findById(saved.getId()).orElseThrow();
        assertEquals(user.getEmail(), loaded.getEmail());
        assertEquals(user.getPasswordHash(), loaded.getPasswordHash());
        assertEquals(user.getDisplayName(), loaded.getDisplayName());
        assertEquals(user.getAvatarPath(), loaded.getAvatarPath());
        assertEquals(user.getDescription(), loaded.getDescription());
        assertEquals(user.getCreatedAt(), loaded.getCreatedAt());
        assertTrue(repository.findById(-1L).isEmpty());
    }
}
