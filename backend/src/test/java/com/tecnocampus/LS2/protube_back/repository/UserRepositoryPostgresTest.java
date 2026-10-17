package com.tecnocampus.LS2.protube_back.repository;

import com.tecnocampus.LS2.protube_back.model.User;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;

import java.time.Instant;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/** Uses an existing PostgreSQL schema; the test transaction is rolled back. */
@DataJpaTest(properties = {
        "spring.datasource.url=jdbc:postgresql://${ENV_PROTUBE_DB_HOST}:5432/${ENV_PROTUBE_DB}",
        "spring.datasource.username=${ENV_PROTUBE_DB_USER}",
        "spring.datasource.password=${ENV_PROTUBE_DB_PASS}",
        "spring.datasource.driver-class-name=org.postgresql.Driver",
        "spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect",
        "spring.jpa.hibernate.ddl-auto=validate",
        "spring.sql.init.mode=never"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
@EnabledIfEnvironmentVariable(named = "RUN_POSTGRES_TESTS", matches = "true")
class UserRepositoryPostgresTest {
    @Autowired UserRepository repository;
    @Autowired TestEntityManager entityManager;

    @Test
    void savesAndReadsUserFromPostgres() {
        var user = new User();
        var email = "repository-test-" + UUID.randomUUID() + "@example.com";
        var createdAt = Instant.parse("2026-10-14T10:00:00Z");
        user.setEmail(email);
        user.setPasswordHash("test-placeholder-not-for-login");
        user.setDisplayName("PostgreSQL repository test");
        user.setAvatarPath("avatars/test.webp");
        user.setDescription("Temporary integration test user");
        user.setCreatedAt(createdAt);

        var saved = repository.saveAndFlush(user);
        assertNotNull(saved.getId());
        var id = saved.getId();
        entityManager.clear();

        var loaded = repository.findById(id).orElseThrow();
        assertEquals(email, loaded.getEmail());
        assertEquals("test-placeholder-not-for-login", loaded.getPasswordHash());
        assertEquals("PostgreSQL repository test", loaded.getDisplayName());
        assertEquals("avatars/test.webp", loaded.getAvatarPath());
        assertEquals("Temporary integration test user", loaded.getDescription());
        assertEquals(createdAt, loaded.getCreatedAt());
    }
}
