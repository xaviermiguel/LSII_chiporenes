package com.tecnocampus.LS2.protube_back.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tecnocampus.LS2.protube_back.repository.CommentRepository;
import com.tecnocampus.LS2.protube_back.repository.VideoRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static com.tecnocampus.LS2.protube_back.services.ImportFixtures.*;

/** Real PostgreSQL import, advisory lock and JSONB; all fixture inserts roll back. */
@DataJpaTest(properties = {
        "spring.datasource.url=jdbc:postgresql://${ENV_PROTUBE_DB_HOST}:${ENV_PROTUBE_DB_PORT:5432}/${ENV_PROTUBE_DB}",
        "spring.datasource.username=${ENV_PROTUBE_DB_USER}",
        "spring.datasource.password=${ENV_PROTUBE_DB_PASS}",
        "spring.datasource.driver-class-name=org.postgresql.Driver",
        "spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect",
        "spring.jpa.hibernate.ddl-auto=validate",
        "spring.flyway.enabled=true",
        "spring.flyway.baseline-on-migrate=false",
        "spring.flyway.clean-disabled=true"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
@Import({VideoImportService.class, VideoGrabberReader.class, ObjectMapper.class})
@EnabledIfEnvironmentVariable(named = "RUN_CATALOG_POSTGRES_TESTS", matches = "true")
class PostgresVideoImportTest {
    @TempDir Path store;
    @Autowired VideoImportService importer;
    @Autowired VideoRepository videos;
    @Autowired CommentRepository comments;
    @Autowired com.tecnocampus.LS2.protube_back.repository.UserRepository users;

    @Test
    void importsTwiceIntoPostgresWithoutDuplicateRecords() throws Exception {
        // Unique numeric filenames avoid any need to delete pre-existing database records.
        int base = (UUID.randomUUID().hashCode() & 0x3fffffff) + 1000;
        for (int id = base; id < base + 3; id++) {
            write(store, id, data(id));
            Files.write(store.resolve(id + ".mp4"), new byte[]{1});
            Files.write(store.resolve(id + ".webp"), new byte[]{2});
        }
        long beforeVideos = videos.count();
        long beforeComments = comments.count();
        assertTrue(importer.usesPostgres());
        var first = importer.importDirectory(store, 2, (long) base);
        var second = importer.importDirectory(store, 2, (long) base);
        assertEquals(3, first.addedVideos());
        assertEquals(2, first.addedComments());
        assertEquals(0, second.addedVideos());
        assertEquals(0, second.addedComments());
        assertEquals(beforeVideos + 3, videos.count());
        assertEquals(beforeComments + 2, comments.count());
        var empty = videos.findByVideoPath(base + ".mp4").orElseThrow();
        var demo = users.findByEmailIgnoreCase("demo@protube.invalid").orElseThrow();
        assertFalse(demo.isEnabled());
        assertEquals(demo.getId(), empty.getOwner().getId());
        assertEquals("Canal externo", empty.getExternalAuthor());
        assertTrue(comments.findByVideoIdOrderByCreatedAtAscIdAsc(empty.getId()).isEmpty());
    }
}
