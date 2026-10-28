package com.tecnocampus.LS2.protube_back.services;

import com.tecnocampus.LS2.protube_back.dto.auth.RegisterRequest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.SpyBean;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;

import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.doAnswer;

/** Opt-in only: registrations commit against the dedicated PostgreSQL test database. */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:postgresql://${ENV_PROTUBE_DB_HOST}:${ENV_PROTUBE_DB_PORT:5432}/${ENV_PROTUBE_DB}",
        "spring.datasource.username=${ENV_PROTUBE_DB_USER}",
        "spring.datasource.password=${ENV_PROTUBE_DB_PASS}",
        "spring.datasource.driver-class-name=org.postgresql.Driver",
        "spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect",
        "spring.jpa.hibernate.ddl-auto=validate",
        "spring.jpa.open-in-view=false",
        "spring.sql.init.mode=never",
        "spring.flyway.enabled=true",
        "spring.flyway.baseline-on-migrate=false",
        "spring.flyway.clean-disabled=true",
        "pro_tube.store.dir=${java.io.tmpdir}",
        "pro_tube.import.enabled=false",
        "pro_tube.load_initial_data=false",
        "server.servlet.session.cookie.secure=false"
})
@ActiveProfiles("test")
@EnabledIfEnvironmentVariable(named = "RUN_POSTGRES_TESTS", matches = "true")
class AuthPostgresTest {
    private static final String PASSWORD = "Postgres registration key!";

    @Autowired AuthService auth;
    @Autowired JdbcTemplate jdbc;
    @SpyBean PasswordEncoder passwords;

    private final Set<String> ownEmails = new HashSet<>();

    @AfterEach
    void removeOnlyThisTestsAccounts() {
        ownEmails.forEach(email -> jdbc.update("delete from public.users where lower(email) = ?", email));
    }

    @Test
    void registrationCommitsNormalizedAccountAndBcryptHash() {
        assertTrue(jdbc.queryForObject("select version()", String.class).contains("PostgreSQL"));
        String email = uniqueEmail();

        var result = auth.register(request("  Repeated public name  ", "  " + email.toUpperCase(Locale.ROOT) + "  "));

        // No test transaction: this independent JDBC read sees the committed registration.
        var persisted = jdbc.queryForMap("""
                select id, email, display_name, password_hash, enabled, description, created_at
                from public.users where id = ?
                """, result.id());
        assertEquals(email, result.email());
        assertEquals(email, persisted.get("email"));
        assertEquals("Repeated public name", persisted.get("display_name"));
        assertEquals(Boolean.TRUE, persisted.get("enabled"));
        assertEquals("", persisted.get("description"));
        assertNotNull(persisted.get("created_at"));
        String hash = (String) persisted.get("password_hash");
        assertNotEquals(PASSWORD, hash);
        assertTrue(hash.startsWith("$2a$12$") || hash.startsWith("$2b$12$") || hash.startsWith("$2y$12$"));
        assertTrue(passwords.matches(PASSWORD, hash));
        assertFalse(passwords.matches("Wrong registration key!", hash));
        assertEquals(result, auth.current(result.id()));
    }

    @Test
    void duplicateEmailIgnoringCaseDoesNotCreateAnotherAccount() {
        String email = uniqueEmail();
        var original = auth.register(request("Same name", email));

        var error = assertThrows(AuthException.class,
                () -> auth.register(request("Another name", "  " + email.toUpperCase(Locale.ROOT) + "  ")));

        assertEquals("EMAIL_ALREADY_REGISTERED", error.code());
        assertEquals(HttpStatus.CONFLICT, error.status());
        assertEquals(1L, count(email));
        assertEquals(original.id(), jdbc.queryForObject(
                "select id from public.users where lower(email) = ?", Long.class, email));
    }

    @Test
    void separateAccountsMayHaveTheSameDisplayName() {
        var first = auth.register(request("Shared name", uniqueEmail()));
        var second = auth.register(request("Shared name", uniqueEmail()));

        assertNotEquals(first.id(), second.id());
        assertEquals(first.displayName(), second.displayName());
    }

    @Test
    void simultaneousRegistrationsProduceOneAccountAndOneConflict() throws Exception {
        String email = uniqueEmail();
        var ready = new CountDownLatch(2);
        var start = new CountDownLatch(1);
        var afterBothPrechecks = new CyclicBarrier(2);
        // Encoding occurs after the real repository lookup. Hold both requests here
        // so the PostgreSQL unique index, rather than the precheck, resolves the race.
        doAnswer(invocation -> {
            afterBothPrechecks.await(10, TimeUnit.SECONDS);
            return invocation.callRealMethod();
        }).when(passwords).encode(PASSWORD);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var first = executor.submit(() -> registerAtTheSameTime(email, ready, start));
            var second = executor.submit(() -> registerAtTheSameTime(email.toUpperCase(Locale.ROOT), ready, start));
            try {
                assertTrue(ready.await(5, TimeUnit.SECONDS), "Both registration requests must be ready");
            } finally {
                start.countDown();
            }
            var results = List.of(first.get(30, TimeUnit.SECONDS), second.get(30, TimeUnit.SECONDS));
            assertEquals(1, results.stream().filter("CREATED"::equals).count());
            assertEquals(1, results.stream().filter("EMAIL_ALREADY_REGISTERED"::equals).count());
        }
        assertEquals(1L, count(email));
        var hash = jdbc.queryForObject("select password_hash from public.users where lower(email) = ?",
                String.class, email);
        assertTrue(passwords.matches(PASSWORD, hash));
    }

    private String registerAtTheSameTime(String email, CountDownLatch ready, CountDownLatch start)
            throws InterruptedException {
        ready.countDown();
        if (!start.await(10, TimeUnit.SECONDS)) throw new IllegalStateException("Registration start timed out");
        try {
            auth.register(request("Concurrent account", email));
            return "CREATED";
        } catch (AuthException exception) {
            assertEquals(HttpStatus.CONFLICT, exception.status());
            return exception.code();
        }
    }

    private RegisterRequest request(String name, String email) {
        return new RegisterRequest(name, email, PASSWORD, PASSWORD);
    }

    private String uniqueEmail() {
        String email = "auth-test-" + UUID.randomUUID() + "@example.com";
        ownEmails.add(email);
        return email;
    }

    private long count(String email) {
        return jdbc.queryForObject("select count(*) from public.users where lower(email) = ?", Long.class, email);
    }
}
