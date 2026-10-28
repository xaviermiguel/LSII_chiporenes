package com.tecnocampus.LS2.protube_back.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tecnocampus.LS2.protube_back.model.User;
import com.tecnocampus.LS2.protube_back.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/** Real servlet container, session expiry and browser-like cookie flow, without security test shortcuts. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "pro_tube.import.enabled=false",
        "pro_tube.load_initial_data=false",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.open-in-view=false",
        "spring.flyway.enabled=false",
        "server.servlet.session.cookie.secure=false"
})
@ActiveProfiles("test")
@Import(AuthHttpIntegrationTest.SessionProbe.class)
class AuthHttpIntegrationTest {
    private static final String PASSWORD = "A good password!";
    private static final String DATABASE_URL = "jdbc:h2:mem:auth-http-" + UUID.randomUUID()
            + ";DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE";
    private static final Path STORE = createStore();

    @DynamicPropertySource
    static void isolatedFixtures(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> DATABASE_URL);
        registry.add("pro_tube.store.dir", STORE::toString);
    }

    @LocalServerPort int port;
    @Autowired ObjectMapper mapper;
    @Autowired UserRepository users;
    @Autowired PasswordEncoder encoder;

    @Test
    void registersNormalizesPersistsHashAndAuthenticatesAcrossRealHttpRequests() throws Exception {
        var browser = new Browser();
        var csrf = browser.csrf();
        var anonymousId = browser.sessionId();
        var email = email();
        var registration = browser.post("/api/auth/register", Map.of(
                "displayName", "  Public user  ", "email", "  " + email.toUpperCase(java.util.Locale.ROOT) + "  ",
                "password", PASSWORD, "confirmPassword", PASSWORD), csrf);

        assertEquals(201, registration.statusCode(), registration.body());
        var user = json(registration);
        assertEquals("Public user", user.path("displayName").asText());
        assertEquals(email, user.path("email").asText());
        assertEquals(3, user.size());
        assertNoSecrets(registration.body());
        assertNotEquals(anonymousId, browser.sessionId(), "Authentication must rotate the anonymous session ID");
        assertSessionCookie(registration);

        var persisted = users.findByEmailIgnoreCase(email).orElseThrow();
        assertEquals(user.path("id").asLong(), persisted.getId());
        assertNotEquals(PASSWORD, persisted.getPasswordHash());
        assertTrue(encoder.matches(PASSWORD, persisted.getPasswordHash()));
        assertTrue(persisted.isEnabled());
        var me = browser.get("/api/auth/me");
        assertEquals(200, me.statusCode(), me.body());
        assertEquals(user, json(me));
        assertSessionCookie(me);

        var replay = raw("GET", "/api/auth/me", null, Map.of("Cookie", "JSESSIONID=" + anonymousId));
        assertError(replay, 401, "AUTHENTICATION_REQUIRED");
        assertError(browser.post("/api/auth/logout", null, csrf), 403, "INVALID_CSRF_TOKEN");
        assertEquals(204, browser.post("/api/auth/logout", null, browser.csrf()).statusCode());
    }

    @Test
    void logsInWithNormalizedEmailAndRejectsOldCredentialsAfterLogout() throws Exception {
        var email = email();
        new Browser().register(email);
        var browser = new Browser();
        var beforeLogin = browser.csrf();
        var anonymousId = browser.sessionId();
        var login = browser.post("/api/auth/login", Map.of(
                "email", " " + email.toUpperCase(java.util.Locale.ROOT) + " ", "password", PASSWORD), beforeLogin);
        assertEquals(200, login.statusCode(), login.body());
        assertEquals(email, json(login).path("email").asText());
        assertNoSecrets(login.body());
        assertNotEquals(anonymousId, browser.sessionId());
        assertEquals(200, browser.get("/api/auth/me").statusCode());
        var authenticatedId = browser.sessionId();

        var logout = browser.post("/api/auth/logout", null, browser.csrf());
        assertEquals(204, logout.statusCode(), logout.body());
        assertEquals("", logout.body());
        assertTrue(logout.headers().allValues("set-cookie").stream()
                .anyMatch(value -> value.startsWith("JSESSIONID=") && value.contains("Max-Age=0")
                        && value.contains("Path=/")), logout.headers().map().toString());
        assertError(browser.get("/api/auth/me"), 401, "AUTHENTICATION_REQUIRED");
        assertError(raw("GET", "/api/auth/me", null,
                Map.of("Cookie", "JSESSIONID=" + authenticatedId)), 401, "AUTHENTICATION_REQUIRED");

        assertEquals(204, browser.post("/api/auth/logout", null, browser.csrf()).statusCode(),
                "Logout without an authenticated session is idempotent with valid CSRF");
    }

    @Test
    void invalidAndDisabledCredentialsNeverCreateAuthenticatedSession() throws Exception {
        var registeredEmail = email();
        new Browser().register(registeredEmail);
        var disabled = new User();
        disabled.setEmail(email());
        disabled.setDisplayName("Disabled");
        disabled.setPasswordHash(encoder.encode(PASSWORD));
        disabled.setEnabled(false);
        users.saveAndFlush(disabled);

        for (var credentials : java.util.List.of(
                Map.of("email", registeredEmail, "password", "Wrong password!"),
                Map.of("email", email(), "password", PASSWORD),
                Map.of("email", disabled.getEmail(), "password", PASSWORD))) {
            var browser = new Browser();
            var response = browser.post("/api/auth/login", credentials, browser.csrf());
            assertError(response, 401, "INVALID_CREDENTIALS");
            assertEquals("Email o contraseña incorrectos.", json(response).path("message").asText());
            assertError(browser.get("/api/auth/me"), 401, "AUTHENTICATION_REQUIRED");
        }
    }

    @Test
    void validatesJsonRequestsAndDoesNotCreateInvalidAccounts() throws Exception {
        var browser = new Browser();
        var csrf = browser.csrf();
        var count = users.count();
        var invalidEmail = email();
        assertError(browser.post("/api/auth/register", Map.of(
                "displayName", "Valid name", "email", invalidEmail,
                "password", PASSWORD, "confirmPassword", "Different password!"), csrf), 400, "PASSWORD_MISMATCH");
        assertError(browser.post("/api/auth/register", Map.of("email", invalidEmail), csrf), 400, "INVALID_REQUEST");
        assertError(browser.post("/api/auth/login", Map.of("email", invalidEmail, "password", ""), csrf),
                400, "INVALID_REQUEST");
        assertError(browser.send("POST", "/api/auth/register", "{invalid-json", Map.of(csrf.headerName(), csrf.token())),
                400, "INVALID_REQUEST");
        for (var scalarFields : java.util.List.of(
                Map.of("displayName", 42, "email", invalidEmail, "password", PASSWORD, "confirmPassword", PASSWORD),
                Map.of("displayName", true, "email", invalidEmail, "password", PASSWORD, "confirmPassword", PASSWORD),
                Map.of("displayName", "Valid name", "email", invalidEmail, "password", 12345678,
                        "confirmPassword", "12345678"))) {
            assertError(browser.post("/api/auth/register", scalarFields, csrf), 400, "INVALID_REQUEST");
        }
        assertEquals(count, users.count());
        assertTrue(users.findByEmailIgnoreCase(invalidEmail).isEmpty());
    }

    @Test
    void returnsConflictForDuplicateEmailIgnoringCaseWithoutCreatingAnotherAccount() throws Exception {
        var email = email();
        new Browser().register(email);
        var count = users.count();
        var browser = new Browser();
        var duplicate = browser.post("/api/auth/register", Map.of(
                "displayName", "A different name", "email", email.toUpperCase(java.util.Locale.ROOT),
                "password", PASSWORD, "confirmPassword", PASSWORD), browser.csrf());
        assertError(duplicate, 409, "EMAIL_ALREADY_REGISTERED");
        assertEquals("El email ya está registrado.", json(duplicate).path("message").asText());
        assertEquals(count, users.count());
        assertError(browser.get("/api/auth/me"), 401, "AUTHENTICATION_REQUIRED");
    }

    @Test
    void rejectsMissingAndIncorrectCsrfForAllAuthWrites() throws Exception {
        var browser = new Browser();
        var request = Map.of("email", email(), "password", PASSWORD);
        assertError(browser.post("/api/auth/login", request, null), 403, "INVALID_CSRF_TOKEN");
        assertError(browser.post("/api/auth/register", Map.of(
                "displayName", "User", "email", email(), "password", PASSWORD, "confirmPassword", PASSWORD), null),
                403, "INVALID_CSRF_TOKEN");
        assertError(browser.post("/api/auth/logout", null, null), 403, "INVALID_CSRF_TOKEN");
        var csrf = browser.csrf();
        assertError(browser.post("/api/auth/login", request, new Csrf(csrf.headerName(), "incorrect-token")),
                403, "INVALID_CSRF_TOKEN");
    }

    @Test
    void keepsCatalogDetailAndMediaPublicWithoutCreatingSessions() throws Exception {
        var browser = new Browser();
        var catalog = browser.get("/api/videos");
        assertEquals(200, catalog.statusCode(), catalog.body());
        assertTrue(json(catalog).path("items").isArray());
        var detail = browser.get("/api/videos/9223372036854775807");
        assertError(detail, 404, "VIDEO_NOT_FOUND");
        var media = browser.get("/media/public-fixture.mp4");
        assertEquals(200, media.statusCode(), media.body());
        assertEquals("synthetic video", media.body());
        for (var response : java.util.List.of(catalog, detail, media)) {
            assertTrue(response.headers().allValues("set-cookie").isEmpty(), response.headers().map().toString());
        }
        assertNull(browser.sessionId());
        assertError(browser.get("/api/auth/me"), 401, "AUTHENTICATION_REQUIRED");
        assertNull(browser.sessionId(), "An unauthenticated failure must not save a request in a new session");
        assertError(raw("GET", "/api/auth/me", null, Map.of("Cookie", "JSESSIONID=invalid-session")),
                401, "AUTHENTICATION_REQUIRED");
    }

    @Test
    void allowsConfiguredCredentialedCorsAndRejectsUntrustedOrigins() throws Exception {
        var origin = "http://localhost:5173";
        var preflight = raw("OPTIONS", "/api/auth/login", null, Map.of(
                "Origin", origin, "Access-Control-Request-Method", "POST",
                "Access-Control-Request-Headers", "content-type,x-csrf-token"));
        assertEquals(200, preflight.statusCode(), preflight.body());
        assertEquals(origin, preflight.headers().firstValue("access-control-allow-origin").orElseThrow());
        assertEquals("true", preflight.headers().firstValue("access-control-allow-credentials").orElseThrow());
        assertTrue(preflight.headers().allValues("set-cookie").isEmpty());
        var allowed = raw("GET", "/api/auth/csrf", null, Map.of("Origin", origin));
        assertEquals(200, allowed.statusCode(), allowed.body());
        assertEquals(origin, allowed.headers().firstValue("access-control-allow-origin").orElseThrow());

        for (var method : java.util.List.of("GET", "OPTIONS")) {
            var headers = method.equals("OPTIONS")
                    ? Map.of("Origin", "https://untrusted.example", "Access-Control-Request-Method", "POST")
                    : Map.of("Origin", "https://untrusted.example");
            var forbidden = raw(method, "/api/auth/csrf", null, headers);
            assertEquals(403, forbidden.statusCode(), forbidden.body());
            assertTrue(forbidden.headers().firstValue("access-control-allow-origin").isEmpty());
        }
    }

    @Test
    void usesSevenDayIdleTimeoutAndRefreshesCookieWhileAuthenticated() throws Exception {
        var browser = new Browser();
        browser.register(email());
        var first = browser.get("/api/test/session-info");
        assertEquals(200, first.statusCode(), first.body());
        assertEquals(604800, json(first).path("maxInactiveInterval").asInt());
        assertSessionCookie(first);
        var second = browser.get("/api/test/session-info");
        assertEquals(200, second.statusCode(), second.body());
        assertTrue(json(second).path("lastAccessedTime").asLong() >= json(first).path("lastAccessedTime").asLong());
        assertSessionCookie(second);

        assertEquals(200, browser.post("/api/test/session-timeout?seconds=2", null, browser.csrf()).statusCode());
        // Total elapsed time exceeds the idle limit, but every request renews the container's access time.
        for (int request = 0; request < 3; request++) {
            Thread.sleep(1100);
            var continued = browser.get("/api/auth/me");
            assertEquals(200, continued.statusCode(), continued.body());
            assertSessionCookie(continued);
        }
    }

    @Test
    void rejectsAnExpiredSessionThroughTheActualServletContainer() throws Exception {
        var browser = new Browser();
        browser.register(email());
        var expireSoon = browser.post("/api/test/session-timeout", null, browser.csrf());
        assertEquals(200, expireSoon.statusCode(), expireSoon.body());
        var oldId = browser.sessionId();
        // Only this isolated test session uses one second; no production timeout or clock is changed.
        Thread.sleep(1300);
        assertError(browser.get("/api/auth/me"), 401, "AUTHENTICATION_REQUIRED");
        assertError(raw("GET", "/api/auth/me", null, Map.of("Cookie", "JSESSIONID=" + oldId)),
                401, "AUTHENTICATION_REQUIRED");
    }

    private void assertError(HttpResponse<String> response, int status, String code) throws IOException {
        assertEquals(status, response.statusCode(), response.body());
        assertEquals(code, json(response).path("code").asText(), response.body());
        assertTrue(json(response).path("message").isTextual());
        assertEquals(2, json(response).size());
        assertNoSecrets(response.body());
    }

    private static void assertNoSecrets(String response) {
        assertFalse(response.contains("passwordHash"));
        assertFalse(response.contains("password_hash"));
        assertFalse(response.contains("confirmPassword"));
        assertFalse(response.contains(PASSWORD));
        assertFalse(response.contains("$2a$"));
        assertFalse(response.contains("org.springframework"));
    }

    private static void assertSessionCookie(HttpResponse<String> response) {
        var cookies = response.headers().allValues("set-cookie");
        assertTrue(cookies.stream().anyMatch(cookie -> cookie.startsWith("JSESSIONID=")
                        && cookie.contains("Max-Age=604800") && cookie.contains("HttpOnly")
                        && cookie.contains("SameSite=Lax") && cookie.contains("Path=/")
                        && !cookie.contains("Secure")), cookies.toString());
    }

    private JsonNode json(HttpResponse<String> response) throws IOException {
        return mapper.readTree(response.body());
    }

    private String email() {
        return "http-" + UUID.randomUUID() + "@example.com";
    }

    private URI uri(String path) {
        return URI.create("http://localhost:" + port + path);
    }

    private HttpResponse<String> raw(String method, String path, String body, Map<String, String> headers)
            throws IOException, InterruptedException {
        return send(HttpClient.newHttpClient(), method, path, body, headers);
    }

    private HttpResponse<String> send(HttpClient client, String method, String path, String body,
                                      Map<String, String> headers) throws IOException, InterruptedException {
        var builder = HttpRequest.newBuilder(uri(path)).timeout(Duration.ofSeconds(15));
        headers.forEach(builder::header);
        if (body != null) {
            builder.header("Content-Type", "application/json");
        }
        builder.method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(body));
        return client.send(builder.build(), HttpResponse.BodyHandlers.ofString());
    }

    private static Path createStore() {
        try {
            var store = Files.createTempDirectory("protube-auth-http-");
            Files.writeString(store.resolve("public-fixture.mp4"), "synthetic video");
            store.resolve("public-fixture.mp4").toFile().deleteOnExit();
            store.toFile().deleteOnExit();
            return store;
        } catch (IOException exception) {
            throw new ExceptionInInitializerError(exception);
        }
    }

    private record Csrf(String headerName, String token) { }

    private final class Browser {
        private final CookieManager cookies = new CookieManager(null, CookiePolicy.ACCEPT_ALL);
        private final HttpClient client = HttpClient.newBuilder().cookieHandler(cookies).build();

        HttpResponse<String> get(String path) throws IOException, InterruptedException {
            return send("GET", path, null, Map.of());
        }

        HttpResponse<String> post(String path, Object body, Csrf csrf) throws IOException, InterruptedException {
            return send("POST", path, body == null ? null : mapper.writeValueAsString(body),
                    csrf == null ? Map.of() : Map.of(csrf.headerName(), csrf.token()));
        }

        HttpResponse<String> send(String method, String path, String body, Map<String, String> headers)
                throws IOException, InterruptedException {
            return AuthHttpIntegrationTest.this.send(client, method, path, body, headers);
        }

        Csrf csrf() throws IOException, InterruptedException {
            var response = get("/api/auth/csrf");
            assertEquals(200, response.statusCode(), response.body());
            var body = json(response);
            assertEquals(2, body.size());
            assertFalse(body.path("token").asText().isEmpty());
            assertFalse(body.path("headerName").asText().isEmpty());
            return new Csrf(body.path("headerName").asText(), body.path("token").asText());
        }

        String sessionId() {
            return cookies.getCookieStore().getCookies().stream()
                    .filter(cookie -> cookie.getName().equals("JSESSIONID") && !cookie.hasExpired())
                    .map(java.net.HttpCookie::getValue).findFirst().orElse(null);
        }

        void register(String email) throws IOException, InterruptedException {
            var response = post("/api/auth/register", Map.of("displayName", "Public user", "email", email,
                    "password", PASSWORD, "confirmPassword", PASSWORD), csrf());
            assertEquals(201, response.statusCode(), response.body());
        }
    }

    @TestConfiguration(proxyBeanMethods = false)
    @RestController
    static class SessionProbe {
        @GetMapping("/api/test/session-info")
        Map<String, Object> sessionInfo(HttpServletRequest request) {
            var session = request.getSession(false);
            return Map.of("maxInactiveInterval", session.getMaxInactiveInterval(),
                    "lastAccessedTime", session.getLastAccessedTime());
        }

        @PostMapping("/api/test/session-timeout")
        Map<String, Boolean> shortenSession(HttpServletRequest request, @RequestParam(defaultValue = "1") int seconds) {
            request.getSession(false).setMaxInactiveInterval(seconds);
            return Map.of("scheduled", true);
        }
    }
}
