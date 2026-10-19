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
        var video = video("missing-author.mp4");
        video.setExternalAuthor(null);
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class,
                () -> videos.saveAndFlush(video));
    }

    @Test
    void databaseRejectsNonpositiveDuration() {
        var video = video("negative-duration.mp4");
        video.setDurationSeconds(java.math.BigDecimal.ZERO);
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class,
                () -> videos.saveAndFlush(video));
    }
}
