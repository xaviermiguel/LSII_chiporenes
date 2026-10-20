package com.tecnocampus.LS2.protube_back.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tecnocampus.LS2.protube_back.model.Comment;
import com.tecnocampus.LS2.protube_back.model.User;
import com.tecnocampus.LS2.protube_back.model.Video;
import com.tecnocampus.LS2.protube_back.repository.CommentRepository;
import com.tecnocampus.LS2.protube_back.repository.UserRepository;
import com.tecnocampus.LS2.protube_back.repository.VideoRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.math.BigDecimal;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Real controller, repositories and resource handler; fixtures never use the configured catalog/store. */
@SpringBootTest(properties = {
        "pro_tube.import.enabled=false",
        "pro_tube.load_initial_data=false",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.open-in-view=false",
        "spring.flyway.enabled=false"
})
@ActiveProfiles("test")
@AutoConfigureMockMvc
@Transactional
class VideoDetailIntegrationTest {
    private static final String VIDEO_PATH = "clips/archivo #ñ 8701.mp4";
    private static final String THUMBNAIL_PATH = "covers/miniatura #ñ.webp";
    private static final String VIDEO_URL = "/media/clips/archivo%20%23%C3%B1%208701.mp4";
    private static final String THUMBNAIL_URL = "/media/covers/miniatura%20%23%C3%B1.webp";
    private static final byte[] VIDEO_BYTES = {0, 1, 2, 3, 4, 5, 6, 7, 8, 9};
    private static final byte[] THUMBNAIL_BYTES = {10, 11, 12};
    private static final String DATABASE_URL = "jdbc:h2:mem:video-detail-" + UUID.randomUUID()
            + ";DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE";
    private static final Path STORE = createStore();

    @DynamicPropertySource
    static void configureIsolatedFixtures(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> DATABASE_URL);
        registry.add("pro_tube.store.dir", STORE::toString);
    }

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired VideoRepository videos;
    @Autowired CommentRepository comments;
    @Autowired UserRepository users;
    @Autowired EntityManager entityManager;

    @Test
    void returnsRequestedPersistedVideoAndOnlyItsOrderedCommentsWithoutAuthentication() throws Exception {
        var owner = user("owner@example.test", "Registered owner");
        var author = user("commenter@example.test", "Registered commenter");
        var requested = video(VIDEO_PATH, "Título exacto del vídeo");
        requested.setOwner(owner);
        videos.saveAndFlush(requested);
        var other = videos.saveAndFlush(video("other-video.mp4", "Unrelated title"));
        var parent = comment(requested, "Registered parent", "2026-10-19T12:00:00Z");
        parent.setAuthor(author);
        comments.saveAndFlush(parent);
        var first = comments.saveAndFlush(comment(requested, "First by date", "2026-10-19T10:00:00Z"));
        var reply = comment(requested, "Reply tied by date", "2026-10-19T12:00:00Z");
        reply.setParent(parent);
        comments.saveAndFlush(reply);
        var middle = comments.saveAndFlush(comment(requested, "Middle by date", "2026-10-19T11:00:00Z"));
        comments.saveAndFlush(comment(other, "PRIVATE TO OTHER VIDEO", "2026-10-19T09:00:00Z"));
        entityManager.clear();

        var response = mvc.perform(get("/api/videos/{id}", requested.getId()))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("application/json"))
                .andExpect(jsonPath("$.id").value(requested.getId().intValue()))
                .andExpect(jsonPath("$.title").value("Título exacto del vídeo"))
                .andExpect(jsonPath("$.description").value("Descripción persistida\ncon dos líneas."))
                .andExpect(jsonPath("$.user").value("Registered owner"))
                .andExpect(jsonPath("$.duration").value(72.25))
                .andExpect(jsonPath("$.videoUrl").value(VIDEO_URL))
                .andExpect(jsonPath("$.thumbnailUrl").value(THUMBNAIL_URL))
                .andExpect(jsonPath("$.comments.length()").value(4))
                .andExpect(jsonPath("$.comments[0].id").value(first.getId().intValue()))
                .andExpect(jsonPath("$.comments[0].text").value("First by date"))
                .andExpect(jsonPath("$.comments[0].user").value("Imported commenter"))
                .andExpect(jsonPath("$.comments[0].createdAt").value("2026-10-19T10:00:00Z"))
                .andExpect(jsonPath("$.comments[1].id").value(middle.getId().intValue()))
                .andExpect(jsonPath("$.comments[2].id").value(parent.getId().intValue()))
                .andExpect(jsonPath("$.comments[2].user").value("Registered commenter"))
                .andExpect(jsonPath("$.comments[3].id").value(reply.getId().intValue()))
                .andExpect(jsonPath("$.comments[3].parentId").value(parent.getId().intValue()))
                .andReturn().getResponse().getContentAsString();

        var json = objectMapper.readTree(response);
        assertEquals(Set.of("id", "title", "user", "duration", "description", "thumbnailUrl", "videoUrl", "comments"),
                fieldNames(json));
        for (var comment : json.path("comments")) {
            assertEquals(Set.of("id", "text", "user", "createdAt", "parentId"), fieldNames(comment));
            assertTrue(comment.path("user").isTextual());
        }
        assertTrue(json.path("comments").get(0).path("parentId").isNull());
        assertFalse(response.contains("PRIVATE TO OTHER VIDEO"));
        assertFalse(response.contains("@example.test"));
        assertFalse(response.contains("password"));
        assertFalse(response.contains("sourceMetadata"));
        assertFalse(json.path("videoUrl").asText().equals("/media/" + requested.getId() + ".mp4"));
    }

    @Test
    void returnsEmptyCommentsAndImportedAuthorWithoutAuthentication() throws Exception {
        var requested = videos.saveAndFlush(video(VIDEO_PATH, "Video without comments"));
        entityManager.clear();

        mvc.perform(get("/api/videos/{id}", requested.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user").value("Imported channel"))
                .andExpect(jsonPath("$.comments").isArray())
                .andExpect(jsonPath("$.comments").isEmpty());
    }

    @Test
    void servesCorrectPublicMediaFromTheReturnedEncodedUrls() throws Exception {
        var requested = videos.saveAndFlush(video(VIDEO_PATH, "Encoded path video"));
        entityManager.clear();
        var detail = mvc.perform(get("/api/videos/{id}", requested.getId()))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        var json = objectMapper.readTree(detail);
        assertEquals(VIDEO_URL, json.path("videoUrl").asText());
        assertEquals(THUMBNAIL_URL, json.path("thumbnailUrl").asText());

        mvc.perform(get(URI.create(json.path("videoUrl").asText())))
                .andExpect(status().isOk())
                .andExpect(content().contentType("video/mp4"))
                .andExpect(header().string(HttpHeaders.ACCEPT_RANGES, "bytes"))
                .andExpect(header().longValue(HttpHeaders.CONTENT_LENGTH, VIDEO_BYTES.length))
                .andExpect(content().bytes(VIDEO_BYTES));
        mvc.perform(get(URI.create(json.path("thumbnailUrl").asText())))
                .andExpect(status().isOk())
                .andExpect(content().bytes(THUMBNAIL_BYTES));
    }

    @Test
    void supportsPartialPublicPlaybackFromTheReturnedVideoUrl() throws Exception {
        var requested = videos.saveAndFlush(video(VIDEO_PATH, "Range video"));
        entityManager.clear();
        var detail = mvc.perform(get("/api/videos/{id}", requested.getId()))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        var videoUrl = objectMapper.readTree(detail).path("videoUrl").asText();

        mvc.perform(get(URI.create(videoUrl)).header(HttpHeaders.RANGE, "bytes=2-5"))
                .andExpect(status().isPartialContent())
                .andExpect(content().contentType("video/mp4"))
                .andExpect(header().string(HttpHeaders.ACCEPT_RANGES, "bytes"))
                .andExpect(header().string(HttpHeaders.CONTENT_RANGE, "bytes 2-5/10"))
                .andExpect(header().longValue(HttpHeaders.CONTENT_LENGTH, 4))
                .andExpect(content().bytes(new byte[]{2, 3, 4, 5}));
    }

    @Test
    void returnsExistingApiErrorForUnknownVideoWithoutAuthentication() throws Exception {
        mvc.perform(get("/api/videos/{id}", Long.MAX_VALUE))
                .andExpect(status().isNotFound())
                .andExpect(content().contentTypeCompatibleWith("application/json"))
                .andExpect(content().json("""
                        {"code":"VIDEO_NOT_FOUND","message":"El vídeo solicitado no existe."}
                        """, true));
    }

    @Test
    void returnsControlledNotFoundForRegisteredVideoWhosePhysicalFileIsMissing() throws Exception {
        var requested = videos.saveAndFlush(video("clips/missing-physical-file.mp4", "Unavailable video"));
        entityManager.clear();

        mvc.perform(get("/api/videos/{id}", requested.getId()))
                .andExpect(status().isNotFound())
                .andExpect(content().contentTypeCompatibleWith("application/json"))
                .andExpect(content().json("""
                        {"code":"VIDEO_NOT_FOUND","message":"El archivo del vídeo no está disponible."}
                        """, true));
        mvc.perform(get("/media/clips/missing-physical-file.mp4"))
                .andExpect(status().isNotFound());
    }

    @Test
    void listsPersistedPublicSummariesOrderedByIdWithoutAuthentication() throws Exception {
        var first = videos.saveAndFlush(video("first-list-video.mp4", "Z title saved first"));
        first.setOwner(user("catalog-owner@example.test", "Catalog owner"));
        videos.saveAndFlush(first);
        videos.saveAndFlush(video("second-list-video.mp4", "A title saved second"));
        entityManager.clear();

        mvc.perform(get("/api/videos"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(12))
                .andExpect(jsonPath("$.hasNext").value(false))
                .andExpect(jsonPath("$.items.length()").value(2))
                .andExpect(jsonPath("$.items[0].id").value(first.getId().intValue()))
                .andExpect(jsonPath("$.items[0].title").value("Z title saved first"))
                .andExpect(jsonPath("$.items[1].title").value("A title saved second"))
                .andExpect(jsonPath("$.items[0].thumbnailUrl").value(THUMBNAIL_URL))
                .andExpect(jsonPath("$.items[0].user").value("Catalog owner"))
                .andExpect(jsonPath("$.items[1].user").value("Imported channel"))
                .andExpect(jsonPath("$.items[0].duration").value(72.25))
                .andExpect(jsonPath("$.items[0].description").doesNotExist())
                .andExpect(jsonPath("$.items[0].videoPath").doesNotExist())
                .andExpect(jsonPath("$.items[0].sourceMetadata").doesNotExist())
                .andExpect(jsonPath("$.items[0].owner").doesNotExist());
    }

    @Test
    void emptyCatalogReturnsAnEmptyPage() throws Exception {
        mvc.perform(get("/api/videos"))
                .andExpect(status().isOk())
                .andExpect(content().json("""
                        {"items":[],"page":0,"size":12,"hasNext":false}
                        """, true));
    }

    @Test
    void loadsAllPagesInIdOrderWithoutDuplicatesAndStopsAtTheEnd() throws Exception {
        var expected = new java.util.ArrayList<Long>();
        for (int i = 0; i < 5; i++) {
            expected.add(videos.saveAndFlush(video("page-" + i + ".mp4", "Same title")).getId());
        }
        entityManager.clear();
        var actual = new java.util.ArrayList<Long>();
        for (int page = 0; page < 4; page++) {
            var response = mvc.perform(get("/api/videos").param("page", "" + page).param("size", "2"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.page").value(page))
                    .andExpect(jsonPath("$.size").value(2))
                    .andExpect(jsonPath("$.hasNext").value(page < 2))
                    .andExpect(jsonPath("$.items.length()").value(page < 2 ? 2 : page == 2 ? 1 : 0))
                    .andReturn().getResponse().getContentAsString();
            objectMapper.readTree(response).path("items").forEach(item -> actual.add(item.path("id").asLong()));
        }
        assertEquals(expected, actual);
        assertEquals(actual.size(), new HashSet<>(actual).size());
    }

    @Test
    void rejectsInvalidPaginationWithTheApiErrorFormat() throws Exception {
        for (String[] input : new String[][]{{"-1", "12"}, {"0", "0"}, {"0", "-1"},
                {"abc", "12"}, {"0", "abc"}, {"2147483648", "12"}, {"0", "2147483647"}}) {
            mvc.perform(get("/api/videos").param("page", input[0]).param("size", input[1]))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("INVALID_PAGINATION"))
                    .andExpect(jsonPath("$.message").isString());
        }
    }

    @Test
    void nonnumericDetailIdStillReturnsBadRequest() throws Exception {
        mvc.perform(get("/api/videos/not-an-id")).andExpect(status().isBadRequest());
    }

    private User user(String email, String displayName) {
        var user = new User();
        user.setEmail(email);
        user.setDisplayName(displayName);
        user.setPasswordHash("private-test-password-hash");
        return users.saveAndFlush(user);
    }

    private Video video(String path, String title) {
        var video = new Video();
        video.setTitle(title);
        video.setDescription("Descripción persistida\ncon dos líneas.");
        video.setVideoPath(path);
        video.setThumbnailPath(THUMBNAIL_PATH);
        video.setDurationSeconds(new BigDecimal("72.25"));
        video.setExternalAuthor("Imported channel");
        video.setPublishedAt(Instant.parse("2026-10-19T08:00:00Z"));
        video.setSourceMetadata(Map.of("video_grabber_id", 8701, "private_metadata", "not public"));
        return video;
    }

    private Comment comment(Video video, String text, String createdAt) {
        var comment = new Comment();
        comment.setVideo(video);
        comment.setText(text);
        comment.setCreatedAt(Instant.parse(createdAt));
        comment.setExternalAuthor("Imported commenter");
        comment.setSourceMetadata(Map.of("private_metadata", "not public"));
        return comment;
    }

    private static Set<String> fieldNames(JsonNode json) {
        var names = new HashSet<String>();
        json.fieldNames().forEachRemaining(names::add);
        return names;
    }

    private static Path createStore() {
        try {
            var store = Files.createTempDirectory("protube detail test ");
            store.toFile().deleteOnExit();
            Files.createDirectory(store.resolve("clips")).toFile().deleteOnExit();
            Files.createDirectory(store.resolve("covers")).toFile().deleteOnExit();
            Files.write(store.resolve(VIDEO_PATH), VIDEO_BYTES).toFile().deleteOnExit();
            Files.write(store.resolve(THUMBNAIL_PATH), THUMBNAIL_BYTES).toFile().deleteOnExit();
            return store;
        } catch (IOException exception) {
            throw new ExceptionInInitializerError(exception);
        }
    }
}
