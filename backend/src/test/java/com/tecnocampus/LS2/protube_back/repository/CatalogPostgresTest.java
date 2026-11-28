package com.tecnocampus.LS2.protube_back.repository;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.junit.jupiter.api.Assertions.*;

/** Run only against a dedicated PostgreSQL test database. Each data test rolls back. */
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
@EnabledIfEnvironmentVariable(named = "RUN_CATALOG_POSTGRES_TESTS", matches = "true")
class CatalogPostgresTest extends CatalogRepositoryTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired UserRepository users;
    @Autowired VideoAnalyticsRepository analytics;

    @Test
    void usesPostgresJsonbAndTheMigratedSchema() {
        assertTrue(jdbc.queryForObject("select version()", String.class).contains("PostgreSQL"));
        assertEquals("jsonb", jdbc.queryForObject("""
                select data_type from information_schema.columns
                where table_schema='public' and table_name='videos' and column_name='source_metadata'
                """, String.class));
        assertEquals("ALWAYS", jdbc.queryForObject("""
                select identity_generation from information_schema.columns
                where table_schema='public' and table_name='comments' and column_name='id'
                """, String.class));
        assertEquals(1, jdbc.queryForObject("""
                select count(*) from public.flyway_schema_history
                where version='1' and success
                """, Integer.class));
    }

    @Test
    void databaseRejectsVideoWithoutAnyAuthor() {
        var video = video("missing-author.mp4", null);
        video.setExternalAuthor(null);
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class,
                () -> videos.saveAndFlush(video));
    }

    @Test
    void databaseRejectsNonpositiveDuration() {
        var video = video("negative-duration.mp4", defaultOwner);
        video.setDurationSeconds(java.math.BigDecimal.ZERO);
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class,
                () -> videos.saveAndFlush(video));
    }

    @Test
    void databaseRejectsDuplicateEmail() {
        assertDuplicateEmail(defaultOwner.getEmail());
    }

    @Test
    void databaseRejectsDuplicateEmailIgnoringCase() {
        assertDuplicateEmail(defaultOwner.getEmail().toUpperCase(java.util.Locale.ROOT));
    }

    @Test
    void countsRecordedViewsAndCommentsInMigratedSchema() {
        var ownerId = defaultOwner.getId();
        var watched = videos.saveAndFlush(video("analytics-watched.mp4", defaultOwner));
        var empty = videos.saveAndFlush(video("analytics-empty.mp4", defaultOwner));
        var oldComment = comment(watched, "Stored comment");
        oldComment.setCreatedAt(java.time.Instant.now().minusSeconds(3 * 86400));
        comments.saveAndFlush(oldComment);
        assertEquals(1, analytics.recordView(watched.getId(), ownerId));
        assertEquals(1, analytics.recordView(watched.getId(), ownerId));
        assertEquals(0, analytics.recordView(Long.MAX_VALUE, ownerId));

        var end = java.time.Instant.now();
        var start = end.minusSeconds(86400);
        var rows = analytics.findForOwner(ownerId, false, start, end);
        assertEquals(2, rows.size());
        assertEquals(empty.getId(), rows.get(0).getId());
        assertEquals(0, rows.get(0).getViews());
        assertEquals(watched.getId(), rows.get(1).getId());
        assertEquals(2, rows.get(1).getViews());
        assertEquals(0, rows.get(1).getComments());
        assertEquals(1, analytics.findForOwner(ownerId, true, start, end).get(1).getComments());
        assertTrue(analytics.findForOwner(Long.MAX_VALUE, true, start, end).isEmpty());
    }

    private void assertDuplicateEmail(String email) {
        var duplicate = new com.tecnocampus.LS2.protube_back.model.User();
        duplicate.setEmail(email);
        duplicate.setDisplayName("Duplicate");
        duplicate.setPasswordHash("unused-test-placeholder");
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class,
                () -> users.saveAndFlush(duplicate));
    }

    @Test
    void postgresRejectsMissingOwnerWithoutJpaValidation() {
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class,
                () -> jdbc.update("""
                        insert into public.videos
                            (title, description, video_path, thumbnail_path, external_author)
                        values ('Missing owner', 'Test', 'null-owner.mp4', 'null-owner.webp', 'External author')
                        """));
    }
}
