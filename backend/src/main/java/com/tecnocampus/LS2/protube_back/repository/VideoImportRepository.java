package com.tecnocampus.LS2.protube_back.repository;

import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Connection;
import java.sql.SQLException;

@Repository
public class VideoImportRepository {
    private final JdbcTemplate jdbc;

    public VideoImportRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public boolean usesPostgres() {
        return Boolean.TRUE.equals(jdbc.execute((ConnectionCallback<Boolean>) this::isPostgres));
    }

    public void lockForImport() {
        jdbc.execute((ConnectionCallback<Void>) connection -> {
            if (isPostgres(connection)) {
                // The transaction-bound connection holds the lock until the import completes.
                try (var statement = connection.createStatement()) {
                    statement.execute("select pg_advisory_xact_lock(7361829401)");
                }
            }
            return null;
        });
    }

    private boolean isPostgres(Connection connection) throws SQLException {
        return connection.getMetaData().getDatabaseProductName().equals("PostgreSQL");
    }
}
