package com.tecnocampus.LS2.protube_back.repository;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/** Creates and drops only its own empty database on the configured test server. */
@EnabledIfEnvironmentVariable(named = "RUN_CATALOG_POSTGRES_TESTS", matches = "true")
class UserOwnershipMigrationPostgresTest {
    @Test
    void upgradesExistingCatalogWithoutChangingMetadataOrExistingOwners() throws Exception {
        String database = "protube_migration_test_" + UUID.randomUUID().toString().replace("-", "");
        String host = System.getenv("ENV_PROTUBE_DB_HOST");
        String port = System.getenv().getOrDefault("ENV_PROTUBE_DB_PORT", "5432");
        String user = System.getenv("ENV_PROTUBE_DB_USER");
        String password = System.getenv("ENV_PROTUBE_DB_PASS");
        String baseUrl = "jdbc:postgresql://" + host + ":" + port + "/";
        try (var admin = DriverManager.getConnection(baseUrl + System.getenv("ENV_PROTUBE_DB"), user, password)) {
            try (var statement = admin.createStatement()) {
                statement.execute("create database " + database);
            }
            try {
                String url = baseUrl + database;
                Flyway.configure().dataSource(url, user, password).defaultSchema("public")
                        .target("1").cleanDisabled(true).load().migrate();
                try (var connection = DriverManager.getConnection(url, user, password)) {
                    seedExistingCatalog(connection);
                    var originalVideos = snapshot(connection, "select id, (to_jsonb(v) - 'owner_id')::text from public.videos v");
                    var originalUsers = snapshot(connection, "select id, to_jsonb(u)::text from public.users u");
                    var originalComments = snapshot(connection, "select id, to_jsonb(c)::text from public.comments c");
                    long existingOwner = number(connection, "select id from public.users where email='existing@example.test'");

                    var flyway = Flyway.configure().dataSource(url, user, password)
                            .defaultSchema("public").cleanDisabled(true).load();
                    assertEquals(1, flyway.migrate().migrationsExecuted);
                    flyway.validate();

                    assertEquals(originalVideos, snapshot(connection,
                            "select id, (to_jsonb(v) - 'owner_id')::text from public.videos v"));
                    assertEquals(originalUsers, snapshot(connection,
                            "select id, (to_jsonb(u) - 'enabled')::text from public.users u where email <> 'demo@protube.invalid'"));
                    assertEquals(originalComments, snapshot(connection,
                            "select id, to_jsonb(c)::text from public.comments c"));
                    assertEquals(existingOwner, number(connection,
                            "select owner_id from public.videos where video_path='owned.mp4'"));
                    long demo = number(connection, "select id from public.users where email='demo@protube.invalid'");
                    assertEquals(demo, number(connection,
                            "select owner_id from public.videos where video_path='sample.mp4'"));
                    assertEquals(0, number(connection, "select count(*) from public.videos where owner_id is null"));
                    assertEquals(1, number(connection,
                            "select count(*) from public.users where email='existing@example.test' and enabled"));
                    assertEquals(1, number(connection,
                            "select count(*) from public.users where email='demo@protube.invalid' and not enabled and password_hash like '$2a$12$%'"));
                    assertEquals(1, number(connection, """
                            select count(*) from information_schema.columns
                            where table_schema='public' and table_name='videos'
                            and column_name='owner_id' and is_nullable='NO'
                            """));
                    assertEquals(0, flyway.migrate().migrationsExecuted);
                    assertEquals(2, number(connection, "select count(*) from public.users"));
                }
            } finally {
                try (var statement = admin.createStatement()) {
                    statement.execute("drop database " + database);
                }
            }
        }
    }

    private void seedExistingCatalog(Connection connection) throws SQLException {
        try (var statement = connection.createStatement()) {
            statement.executeUpdate("""
                    insert into public.users (email, password_hash, display_name)
                    values ('existing@example.test', 'legacy-placeholder', 'Existing user')
                    """);
            statement.executeUpdate("""
                    insert into public.videos
                        (owner_id, title, description, video_path, thumbnail_path, external_author, source_metadata)
                    values
                        (null, 'Sample', 'Original sample description', 'sample.mp4', 'sample.webp',
                         'Original channel', '{"tags":["music"],"video_grabber_id":42}'),
                        ((select id from public.users where email='existing@example.test'),
                         'Owned', 'Original owned description', 'owned.mp4', 'owned.webp', null, '{"custom":true}')
                    """);
            statement.executeUpdate("""
                    insert into public.comments (video_id, text, external_author, source_metadata)
                    values ((select id from public.videos where video_path='sample.mp4'),
                            'Preserve this comment', 'External commenter', '{"like_count":3}')
                    """);
        }
    }

    private Map<Long, String> snapshot(Connection connection, String sql) throws SQLException {
        var rows = new LinkedHashMap<Long, String>();
        try (var statement = connection.createStatement(); var result = statement.executeQuery(sql)) {
            while (result.next()) rows.put(result.getLong(1), result.getString(2));
        }
        return rows;
    }

    private long number(Connection connection, String sql) throws SQLException {
        try (var statement = connection.createStatement(); var result = statement.executeQuery(sql)) {
            assertTrue(result.next());
            return result.getLong(1);
        }
    }
}
