package com.tecnocampus.LS2.protube_back.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tecnocampus.LS2.protube_back.model.User;
import com.tecnocampus.LS2.protube_back.model.Video;
import com.tecnocampus.LS2.protube_back.repository.CommentRepository;
import com.tecnocampus.LS2.protube_back.repository.UserRepository;
import com.tecnocampus.LS2.protube_back.repository.VideoRepository;
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
import java.nio.charset.StandardCharsets;
import java.util.Arrays;

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
import java.util.List;
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
    @Autowired VideoRepository videos;
    @Autowired CommentRepository comments;

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

    @Test
    void swaggerIsPublicWhileCurrentUserStillRequiresAuthentication() throws Exception {
        assertEquals(200, raw("GET", "/swagger-ui/index.html", null, Map.of()).statusCode());
        assertEquals(200, raw("GET", "/swagger-ui/swagger-ui.css", null, Map.of()).statusCode());
        assertEquals(200, raw("GET", "/v3/api-docs/swagger-config", null, Map.of()).statusCode());
        var docs = raw("GET", "/v3/api-docs", null, Map.of());
        assertEquals(200, docs.statusCode());
        assertTrue(json(docs).path("paths").has("/api/auth/login"));
        assertError(raw("GET", "/api/auth/me", null, Map.of()), 401, "AUTHENTICATION_REQUIRED");
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

    @Test
    void editsOnlyCurrentProfileWithCsrfAndPersistsNormalizedFields() throws Exception {
        var anonymous = new Browser();
        assertEquals(401, anonymous.get("/api/auth/profile").statusCode());
        assertEquals(401, anonymous.get("/api/videos/me").statusCode());
        var browser = new Browser();
        browser.register(UUID.randomUUID() + "@example.com");
        var before = json(browser.get("/api/auth/profile"));
        String email = UUID.randomUUID() + "@example.com";
        var body = Map.of("displayName", " Updated user ", "email", email.toUpperCase(), "description", " About me ");
        assertEquals(403, browser.send("PATCH", "/api/auth/profile", mapper.writeValueAsString(body), Map.of()).statusCode());
        var token = browser.csrf();
        var updated = browser.send("PATCH", "/api/auth/profile", mapper.writeValueAsString(body), Map.of(token.headerName(), token.token()));
        assertEquals(200, updated.statusCode(), updated.body());
        assertEquals(before.path("id"), json(updated).path("id"));
        assertEquals("Updated user", json(updated).path("displayName").asText());
        assertEquals(email, json(updated).path("email").asText());
        assertEquals("About me", json(browser.get("/api/auth/profile")).path("description").asText());
        assertFalse(updated.body().contains("password"));
        assertEquals(email, json(browser.get("/api/auth/me")).path("email").asText());
    }

    @Test //Test de consulta datos publicos cuenta
    void exposesOnlyPublicProfileFieldsWithoutAuthentication() throws Exception {
        var registered = new Browser();
        registered.register(UUID.randomUUID() + "@example.com");

        var currentUser = registered.get("/api/auth/me");
        assertEquals(200, currentUser.statusCode(), currentUser.body());
        long userId = json(currentUser).get("id").asLong();

        var anonymous = new Browser();
        var response = anonymous.get("/api/users/" + userId);

        assertEquals(200, response.statusCode(), response.body());
        var profile = json(response);

        assertAll(
                () -> assertEquals(4, profile.size(), response.body()),
                () -> assertEquals(userId, profile.get("id").asLong()),
                () -> assertEquals("Public user", profile.get("displayName").asText()),
                () -> assertEquals("", profile.get("description").asText()),
                () -> assertEquals("/assets/avatar-default.png", profile.get("avatarURL").asText())
        );

        var missing = anonymous.get("/api/users/" + Long.MAX_VALUE);
        assertEquals(404, missing.statusCode(), missing.body());
    }
    //Test permisos entre cuentas
    @Test
    void updatesOnlyAuthenticatedProfileWhenBodyContainsAnotherUserId() throws Exception {
        var accountA = new Browser();
        accountA.register(UUID.randomUUID() + "@example.com");

        var responseA = accountA.get("/api/auth/me");
        assertEquals(200, responseA.statusCode(), responseA.body());
        long idA = json(responseA).get("id").asLong();

        var accountB = new Browser();
        String emailB = UUID.randomUUID() + "@example.com";
        accountB.register(emailB);

        var responseB = accountB.get("/api/auth/me");
        assertEquals(200, responseB.statusCode(), responseB.body());
        long idB = json(responseB).get("id").asLong();
        assertNotEquals(idA, idB);

        var anonymous = new Browser();
        var beforeA = anonymous.get("/api/users/" + idA);
        assertEquals(200, beforeA.statusCode(), beforeA.body());

        String newDescription = "Prueba de perfil B";
        var body = Map.of(
                "id", idA,
                "displayName", "Public user",
                "email", emailB,
                "description", newDescription
        );

        var csrf = accountB.csrf();
        var updated = accountB.send(
                "PATCH",
                "/api/auth/profile",
                mapper.writeValueAsString(body),
                Map.of(csrf.headerName(), csrf.token())
        );

        assertEquals(200, updated.statusCode(), updated.body());
        assertEquals(idB, json(updated).get("id").asLong());

        var afterB = anonymous.get("/api/users/" + idB);
        assertEquals(200, afterB.statusCode(), afterB.body());
        assertEquals(newDescription, json(afterB).get("description").asText());

        var afterA = anonymous.get("/api/users/" + idA);
        assertEquals(200, afterA.statusCode(), afterA.body());
        assertEquals(json(beforeA), json(afterA));
    }
    //Test automatizacion subida y validación avatar
    @Test
    void uploadsAvatarAndPreservesItAfterRejectedUploads() throws Exception {
        var accountA = new Browser();
        accountA.register(UUID.randomUUID() + "@example.com");
        long idA = json(accountA.get("/api/auth/me")).get("id").asLong();

        var accountB = new Browser();
        accountB.register(UUID.randomUUID() + "@example.com");
        long idB = json(accountB.get("/api/auth/me")).get("id").asLong();

        byte[] png;
        try (var input = getClass().getResourceAsStream("/static/assets/avatar-default.png")) {
            assertNotNull(input, "Falta el PNG de prueba");
            png = input.readAllBytes();
        }

        var uploaded = accountB.putAvatar(png);
        assertEquals(204, uploaded.statusCode(), uploaded.body());

        var anonymous = new Browser();
        var profileB = anonymous.get("/api/users/" + idB);
        assertEquals(200, profileB.statusCode(), profileB.body());
        String avatarUrl = json(profileB).get("avatarURL").asText();
        assertTrue(avatarUrl.startsWith("/media/avatars/"), avatarUrl);

        var image = anonymous.get(avatarUrl);
        assertEquals(200, image.statusCode());
        assertEquals("image/png", image.headers().firstValue("Content-Type").orElse(""));

        var invalid = accountB.putAvatar("Esto no es un PNG".getBytes(StandardCharsets.UTF_8));
        assertEquals(400, invalid.statusCode(), invalid.body());
        assertEquals(avatarUrl,
                json(anonymous.get("/api/users/" + idB)).get("avatarURL").asText());

        byte[] oversized = Arrays.copyOf(png, 2 * 1024 * 1024 + 1);
        var tooLarge = accountB.putAvatar(oversized);
        assertEquals(413, tooLarge.statusCode(), tooLarge.body());
        assertEquals(avatarUrl,
                json(anonymous.get("/api/users/" + idB)).get("avatarURL").asText());

        assertEquals("/assets/avatar-default.png",
                json(anonymous.get("/api/users/" + idA)).get("avatarURL").asText());
    }
    //Test de publicar commentario y devovler detalles
    @Test
    void publishesCommentAndReturnsItInVideoDetail() throws Exception {
        long videoId = createTestVideo();
        String videoPath = "/api/videos/" + videoId;
        String text = "Comentario de integración";

        var browser = new Browser();
        browser.register(UUID.randomUUID() + "@example.com");

        var currentUser = browser.get("/api/auth/me");
        assertEquals(200, currentUser.statusCode(), currentUser.body());
        String authorName = json(currentUser).path("displayName").asText();

        var published = browser.post(
                videoPath + "/comments",
                Map.of("text", text),
                browser.csrf()
        );

        assertEquals(201, published.statusCode(), published.body());
        var comment = json(published);
        long commentId = comment.path("id").asLong();
        assertTrue(commentId > 0, published.body());
        assertEquals(text, comment.path("text").asText());
        assertEquals(authorName, comment.path("user").asText());
        assertTrue(comment.path("parentId").isNull());

        var detail = new Browser().get(videoPath);
        assertEquals(200, detail.statusCode(), detail.body());

        var comments = json(detail).path("comments");
        for (var stored : comments) {
            if (stored.path("id").asLong() == commentId) {
                assertEquals(text, stored.path("text").asText());
                assertEquals(authorName, stored.path("user").asText());
                return;
            }
        }

        fail("El comentario " + commentId + " no aparece en el vídeo " + videoId);
    }

    @Test
    void publishesRepliesWithSessionAuthorAndReturnsThemInStableOrder() throws Exception {
        long videoId = createTestVideo();
        String videoPath = "/api/videos/" + videoId;
        var parentAuthor = new Browser();
        parentAuthor.register(UUID.randomUUID() + "@example.com");
        long parentId = publishParent(parentAuthor, videoPath);
        long parentAuthorId = json(parentAuthor.get("/api/auth/me")).path("id").asLong();

        var replyAuthor = new Browser();
        replyAuthor.register(UUID.randomUUID() + "@example.com");
        var author = json(replyAuthor.get("/api/auth/me"));
        String replyPath = videoPath + "/comments/" + parentId + "/replies";
        String text = "😀".repeat(150);
        var csrf = replyAuthor.csrf();
        var first = replyAuthor.post(replyPath, Map.of("text", text, "authorId", parentAuthorId), csrf);
        var second = replyAuthor.post(replyPath, Map.of("text", "Second reply"), csrf);
        assertEquals(201, first.statusCode(), first.body());
        assertEquals(201, second.statusCode(), second.body());
        var reply = json(first);
        long firstId = reply.path("id").asLong();
        long secondId = json(second).path("id").asLong();
        assertEquals(text, reply.path("text").asText());
        assertEquals(author.path("displayName").asText(), reply.path("user").asText());
        assertTrue(reply.path("createdAt").isTextual());
        assertEquals(parentId, reply.path("parentId").asLong());

        var stored = comments.findById(firstId).orElseThrow();
        assertEquals(author.path("id").asLong(), stored.getAuthor().getId());
        assertEquals(videoId, stored.getVideoId());
        assertEquals(parentId, stored.getParentId());
        var storedSecond = comments.findById(secondId).orElseThrow();
        storedSecond.setCreatedAt(stored.getCreatedAt());
        comments.saveAndFlush(storedSecond);

        var detail = new Browser().get(videoPath);
        assertEquals(200, detail.statusCode(), detail.body());
        var entries = json(detail).path("comments");
        assertEquals(3, entries.size());
        assertEquals(parentId, entries.get(0).path("id").asLong());
        assertTrue(entries.get(0).path("parentId").isNull());
        assertEquals(firstId, entries.get(1).path("id").asLong());
        assertEquals(secondId, entries.get(2).path("id").asLong());
        assertEquals(entries.get(1).path("createdAt"), entries.get(2).path("createdAt"));
        assertEquals(parentId, entries.get(2).path("parentId").asLong());
    }

    @Test
    void rejectsInvalidReplyRequestsWithoutCreatingComments() throws Exception {
        long videoId = createTestVideo();
        String videoPath = "/api/videos/" + videoId;
        String otherVideoPath = "/api/videos/" + createTestVideo();
        var browser = new Browser();
        browser.register(UUID.randomUUID() + "@example.com");
        long parentId = publishParent(browser, videoPath);
        String replyPath = videoPath + "/comments/" + parentId + "/replies";
        var csrf = browser.csrf();
        var body = Map.of("text", "A reply");

        for (String invalid : List.of("", " \t\n", "😀".repeat(150) + "a")) {
            assertError(browser.post(replyPath, Map.of("text", invalid), csrf), 400, "INVALID_COMMENT");
        }
        assertError(browser.post(replyPath, Map.of(), csrf), 400, "INVALID_COMMENT");
        assertError(browser.post(replyPath, body, null), 403, "INVALID_CSRF_TOKEN");
        var anonymous = new Browser();
        assertError(anonymous.post(replyPath, body, anonymous.csrf()), 401, "AUTHENTICATION_REQUIRED");
        assertError(browser.post(videoPath + "/comments/" + Long.MAX_VALUE + "/replies", body, csrf),
                404, "COMMENT_NOT_FOUND");
        assertError(browser.post(otherVideoPath + "/comments/" + parentId + "/replies", body, csrf),
                404, "COMMENT_NOT_FOUND");
        assertError(browser.post("/api/videos/" + Long.MAX_VALUE + "/comments/" + parentId + "/replies", body, csrf),
                404, "VIDEO_NOT_FOUND");
        var published = browser.post(replyPath, body, csrf);
        assertEquals(201, published.statusCode(), published.body());
        long replyId = json(published).path("id").asLong();
        assertError(browser.post(videoPath + "/comments/" + replyId + "/replies", body, csrf),
                400, "INVALID_COMMENT");

        var author = users.findById(json(browser.get("/api/auth/me")).path("id").asLong()).orElseThrow();
        author.setEnabled(false);
        users.saveAndFlush(author);
        assertError(browser.post(replyPath, body, csrf), 401, "AUTHENTICATION_REQUIRED");
        assertEquals(2, json(anonymous.get(videoPath)).path("comments").size());
        assertEquals(0, json(anonymous.get(otherVideoPath)).path("comments").size());
    }

    private long publishParent(Browser browser, String videoPath) throws Exception {
        var response = browser.post(videoPath + "/comments", Map.of("text", "Parent comment"), browser.csrf());
        assertEquals(201, response.statusCode(), response.body());
        var parent = json(response);
        assertTrue(parent.path("parentId").isNull());
        return parent.path("id").asLong();
    }

    private long createTestVideo() throws Exception {
    var ownerBrowser = new Browser();
    var registration = ownerBrowser.post(
            "/api/auth/register",
            Map.of (
                    "displayName", "Propietario del vídeo",
                    "email",UUID.randomUUID() + "@example.com",
                    "password", PASSWORD,
                    "confirmPassword",PASSWORD
            ),
            ownerBrowser.csrf()
    );
    assertEquals(201,registration.statusCode(),registration.body());
    long ownerId = json (registration).path("id").asLong();
    var owner = users.findById(ownerId).orElseThrow();

    String filename = "comment-test-" + UUID.randomUUID() + ".mp4";
    Path videoFile = STORE.resolve(filename);
    Files.writeString(videoFile, "synthetic video");
    videoFile.toFile().deleteOnExit();

    var video = new Video();
    video.setOwner(owner);
    video.setTitle("Vídeo de prueba para comentarios");
    video.setDescription("Vídeo para probar la publicación de comentarios");
    video.setVideoPath(filename);
    video.setThumbnailPath("comment-test.webp");

    return videos.saveAndFlush(video).getId();
    }
    @Test
    void validatesCommentTextAndAcceptsTheLengthLimit() throws Exception {
        String videoPath = "/api/videos/" + createTestVideo();
        var browser = new Browser();
        browser.register(UUID.randomUUID() + "@example.com");
        var csrf = browser.csrf();

        for (String invalidText : List.of("", "   ", "a".repeat(301))) {
            var rejected = browser.post(videoPath + "/comments", Map.of("text", invalidText), csrf);
            assertError(rejected, 400, "INVALID_COMMENT");
        }

        var detail = new Browser().get(videoPath);
        assertEquals(200, detail.statusCode(), detail.body());
        assertEquals(0, json(detail).path("comments").size());

        String maxLengthText = "a".repeat(300);
        var accepted = browser.post(videoPath + "/comments", Map.of("text", maxLengthText), csrf);
        assertEquals(201, accepted.statusCode(), accepted.body());
        assertEquals(maxLengthText, json(accepted).path("text").asText());
    }

    @Test
    void rejectsCommentOnMissingVideo() throws Exception {
        long missingVideoId = Long.MAX_VALUE;
        assertFalse(videos.existsById(missingVideoId));

        var browser = new Browser();
        browser.register(UUID.randomUUID() + "@example.com");
        var rejected = browser.post(
                "/api/videos/" + missingVideoId + "/comments",
                Map.of("text", "Comentario para un vídeo inexistente"),
                browser.csrf()
        );

        assertError(rejected, 404, "VIDEO_NOT_FOUND");
    }

    @Test
    void rejectsAnonymousCommentWithValidCsrf() throws Exception {
        String videoPath = "/api/videos/" + createTestVideo();
        var anonymous = new Browser();

        var rejected = anonymous.post(
                videoPath + "/comments",
                Map.of("text", "Comentario sin iniciar sesión"),
                anonymous.csrf()
        );
        assertError(rejected, 401, "AUTHENTICATION_REQUIRED");

        var detail = anonymous.get(videoPath);
        assertEquals(200, detail.statusCode(), detail.body());
        assertEquals(0, json(detail).path("comments").size());
    }

    @Test
    void rejectsCommentFromDisabledUserWithExistingSession() throws Exception {
        long videoId = createTestVideo();
        String videoPath = "/api/videos/" + videoId;

        var browser = new Browser();
        browser.register(UUID.randomUUID() + "@example.com");

        var currentUser = browser.get("/api/auth/me");
        assertEquals(200, currentUser.statusCode(), currentUser.body());
        long authorId = json(currentUser).path("id").asLong();
        var csrf = browser.csrf();

        var reader = new Browser();
        var before = reader.get(videoPath);
        assertEquals(200, before.statusCode(), before.body());
        int commentCount = json(before).path("comments").size();

        var author = users.findById(authorId).orElseThrow();
        author.setEnabled(false);
        users.saveAndFlush(author);

        var rejected = browser.post(
                videoPath + "/comments",
                Map.of("text", "Comentario desde una cuenta deshabilitada"),
                csrf
        );
        assertError(rejected, 401, "AUTHENTICATION_REQUIRED");

        var after = reader.get(videoPath);
        assertEquals(200, after.statusCode(), after.body());
        assertEquals(commentCount, json(after).path("comments").size());
    }



    @Test
    void rejectsDuplicateEmailAndInvalidProfileWithoutChangingStoredValues() throws Exception {
        var first = new Browser(); var second = new Browser();
        String taken = UUID.randomUUID() + "@example.com";
        first.register(taken); second.register(UUID.randomUUID() + "@example.com");
        var before = json(second.get("/api/auth/profile"));
        var token = second.csrf();
        for (var candidate : java.util.List.of(
                Map.of("displayName", "Changed", "email", taken, "description", ""),
                Map.of("displayName", " ", "email", taken, "description", ""),
                Map.of("displayName", "Changed", "email", "invalid", "description", ""),
                Map.of("displayName", "Changed", "email", UUID.randomUUID() + "@example.com", "description", "x".repeat(2001)))) {
            var result = second.send("PATCH", "/api/auth/profile", mapper.writeValueAsString(candidate), Map.of(token.headerName(), token.token()));
            assertTrue(result.statusCode() == 400 || result.statusCode() == 409, result.body());
            assertEquals(before, json(second.get("/api/auth/profile")));
        }
    }

    @Test
    void changesPasswordOnlyWithCurrentPasswordAndClosesCurrentSession() throws Exception {
        var browser = new Browser();
        String email = UUID.randomUUID() + "@example.com";
        browser.register(email);
        var body = Map.of("currentPassword", "incorrect", "newPassword", "New-password1!", "confirmPassword", "New-password1!");
        assertEquals(403, browser.post("/api/auth/password", body, null).statusCode());
        var rejected = browser.post("/api/auth/password", body, browser.csrf());
        assertEquals(400, rejected.statusCode());
        assertEquals("CURRENT_PASSWORD_INVALID", json(rejected).path("code").asText());
        assertEquals(200, browser.get("/api/auth/me").statusCode());
        var invalid = browser.post("/api/auth/password", Map.of("currentPassword", PASSWORD, "newPassword", "short", "confirmPassword", "short"), browser.csrf());
        assertEquals(400, invalid.statusCode());
        assertEquals(204, browser.post("/api/auth/password", Map.of("currentPassword", PASSWORD, "newPassword", "New-password1!", "confirmPassword", "New-password1!"), browser.csrf()).statusCode());
        assertEquals(401, browser.get("/api/auth/me").statusCode());
        assertEquals(401, browser.post("/api/auth/login", Map.of("email", email, "password", PASSWORD), browser.csrf()).statusCode());
        assertEquals(200, browser.post("/api/auth/login", Map.of("email", email, "password", "New-password1!"), browser.csrf()).statusCode());
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

    @Test
    void countsActivityWithoutChangingCountersAndIsolatesCreators() throws Exception {
        String path = "/api/videos/me/analytics";
        var anonymous = new Browser();
        assertEquals(401, anonymous.get(path).statusCode());

        var creator = new Browser();
        String creatorEmail = UUID.randomUUID() + "@example.com";
        creator.register(creatorEmail);
        var other = new Browser();
        String otherEmail = UUID.randomUUID() + "@example.com";
        other.register(otherEmail);
        assertEquals(mapper.readTree("{\"views\":0,\"comments\":0,\"videos\":[]}"), json(other.get(path)));

        long ownId = analyticsVideo(creatorEmail, "Own video");
        long emptyId = analyticsVideo(creatorEmail, "No activity");
        long otherId = analyticsVideo(otherEmail, "Other video");
        String ownViews = "/api/videos/" + ownId + "/views";
        assertEquals(401, anonymous.post(ownViews, null, anonymous.csrf()).statusCode());
        assertEquals(403, other.post(ownViews, null, null).statusCode());
        assertEquals(404, other.post("/api/videos/" + Long.MAX_VALUE + "/views", null, other.csrf()).statusCode());
        assertEquals(204, other.post(ownViews, null, other.csrf()).statusCode());
        assertEquals(204, creator.post(ownViews, null, creator.csrf()).statusCode());
        assertEquals(204, creator.post("/api/videos/" + otherId + "/views", null, creator.csrf()).statusCode());
        assertEquals(201, other.post("/api/videos/" + ownId + "/comments",
                Map.of("text", "Known comment"), other.csrf()).statusCode());

        var before = creator.get(path);
        assertEquals(200, before.statusCode(), before.body());
        var expected = Map.of("views", 2, "comments", 1, "videos", List.of(
                Map.of("id", emptyId, "title", "No activity", "thumbnailUrl", "/media/No%20activity.webp", "views", 0, "comments", 0),
                Map.of("id", ownId, "title", "Own video", "thumbnailUrl", "/media/Own%20video.webp", "views", 2, "comments", 1)));
        assertEquals(mapper.readTree(mapper.writeValueAsString(expected)), json(before));
        assertEquals(json(before), json(creator.get(path)));
        assertEquals(json(before), json(creator.get(path + "?ownerId=" +
                users.findByEmailIgnoreCase(otherEmail).orElseThrow().getId())));

        var otherStats = json(other.get(path));
        assertEquals(1, otherStats.path("views").asInt());
        assertEquals(0, otherStats.path("comments").asInt());
        assertEquals(1, otherStats.path("videos").size());
        assertEquals(otherId, otherStats.path("videos").get(0).path("id").asLong());
    }

    private long analyticsVideo(String email, String title) {
        var video = new Video();
        video.setOwner(users.findByEmailIgnoreCase(email).orElseThrow());
        video.setTitle(title);
        video.setDescription("");
        video.setVideoPath(UUID.randomUUID() + ".mp4");
        video.setThumbnailPath(title + ".webp");
        return videos.saveAndFlush(video).getId();
    }

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

        HttpResponse<String> putAvatar(byte[] bytes) throws IOException, InterruptedException {
            var csrf = csrf();
            String boundary = "avatar-" + UUID.randomUUID();
            String prefix = "--" + boundary + "\r\n"
                    + "Content-Disposition: form-data; name=\"avatar\"; filename=\"avatar.png\"\r\n"
                    + "Content-Type: image/png\r\n\r\n";
            String suffix = "\r\n--" + boundary + "--\r\n";

            var body = HttpRequest.BodyPublishers.concat(
                    HttpRequest.BodyPublishers.ofString(prefix),
                    HttpRequest.BodyPublishers.ofByteArray(bytes),
                    HttpRequest.BodyPublishers.ofString(suffix)
            );

            var request = HttpRequest.newBuilder(
                            URI.create("http://localhost:" + port + "/api/auth/profile/avatar"))
                    .header("Content-Type", "multipart/form-data; boundary=" + boundary)
                    .header(csrf.headerName(), csrf.token())
                    .PUT(body)
                    .build();

            return client.send(request, HttpResponse.BodyHandlers.ofString());
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
