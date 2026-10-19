package com.tecnocampus.LS2.protube_back.repository;

import com.tecnocampus.LS2.protube_back.model.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/** Isolated mapping tests only; PostgreSQL migration/constraints have separate opt-in tests. */
@DataJpaTest(properties = {"spring.jpa.hibernate.ddl-auto=create-drop", "spring.flyway.enabled=false"})
@ActiveProfiles("test")
class CatalogRepositoryTest {
    @Autowired VideoRepository videos;
    @Autowired CommentRepository comments;
    @Autowired TestEntityManager entityManager;

    static Video video(String path) {
        var video = new Video();
        video.setTitle("Stored video");
        video.setDescription("Stored description");
        video.setVideoPath(path);
        video.setThumbnailPath(path + ".webp");
        video.setExternalAuthor("External channel");
        video.setDurationSeconds(new BigDecimal("72.25"));
        video.setWidth(1920);
        video.setHeight(1080);
        video.setPublishedAt(Instant.parse("2026-10-14T10:00:00Z"));
        video.setSourceMetadata(Map.of("video_grabber_id", 2, "tags", java.util.List.of("music")));
        return video;
    }

    static Comment comment(Video video, String text) {
        var comment = new Comment();
        comment.setVideo(video);
        comment.setText(text);
        comment.setExternalAuthor("External commenter");
        comment.setCreatedAt(Instant.parse("2026-10-14T11:00:00Z"));
        comment.setSourceMetadata(Map.of("like_count", 3));
        return comment;
    }

    @Test
    void roundTripsMetadataAuthorsCategoryRepliesAndEmptyComments() {
        var owner = new User();
        owner.setEmail("catalog@example.com");
        owner.setPasswordHash("test-placeholder");
        owner.setDisplayName("Local owner");
        entityManager.persist(owner);
        var category = new Category();
        category.setName("Music");
        entityManager.persist(category);
        var video = video("catalog-test.mp4");
        video.setOwner(owner);
        video.setCategory(category);
        videos.saveAndFlush(video);
        var empty = videos.saveAndFlush(video("empty-test.mp4"));
        var parent = comment(video, "First comment");
        parent.setAuthor(owner);
        comments.saveAndFlush(parent);
        var reply = comment(video, "Reply");
        reply.setParent(parent);
        comments.saveAndFlush(reply);
        var detached = comment(video, "Top level");
        detached.setParent(parent);
        detached.setParent(null);
        comments.saveAndFlush(detached);
        entityManager.clear();

        var loaded = videos.findByVideoPath("catalog-test.mp4").orElseThrow();
        assertAll(
                () -> assertEquals(video.getId(), loaded.getId()),
                () -> assertEquals("Stored video", loaded.getTitle()),
                () -> assertEquals("Stored description", loaded.getDescription()),
                () -> assertEquals("catalog-test.mp4.webp", loaded.getThumbnailPath()),
                () -> assertEquals(video.getDurationSeconds(), loaded.getDurationSeconds()),
                () -> assertEquals(1920, loaded.getWidth()),
                () -> assertEquals(1080, loaded.getHeight()),
                () -> assertEquals(video.getPublishedAt(), loaded.getPublishedAt()),
                () -> assertEquals("External channel", loaded.getExternalAuthor()),
                () -> assertEquals("Local owner", loaded.getOwner().getDisplayName()),
                () -> assertEquals("Music", loaded.getCategory().getName()),
                () -> assertEquals(category.getId(), loaded.getCategory().getId()),
                () -> assertEquals(video.getSourceMetadata(), loaded.getSourceMetadata())
        );
        var stored = comments.findByVideoIdOrderByCreatedAtAscIdAsc(loaded.getId());
        assertEquals(java.util.List.of("First comment", "Reply", "Top level"),
                stored.stream().map(Comment::getText).toList());
        assertEquals(owner.getId(), stored.getFirst().getAuthor().getId());
        assertEquals("External commenter", stored.getFirst().getExternalAuthor());
        assertEquals(parent.getCreatedAt(), stored.getFirst().getCreatedAt());
        assertEquals(parent.getSourceMetadata(), stored.getFirst().getSourceMetadata());
        assertEquals(parent.getId(), stored.get(1).getParentId());
        assertEquals(parent.getId(), stored.get(1).getParent().getId());
        assertNull(stored.get(2).getParent());
        assertTrue(comments.findByVideoIdOrderByCreatedAtAscIdAsc(empty.getId()).isEmpty());
        assertEquals(2, videos.findAllByOrderByIdAsc().size());
    }

    @Test
    void videoPathIsUnique() {
        videos.saveAndFlush(video("duplicate.mp4"));
        assertThrows(DataIntegrityViolationException.class,
                () -> videos.saveAndFlush(video("duplicate.mp4")));
    }

    @Test
    void replyCannotBelongToAnotherVideo() {
        var first = videos.saveAndFlush(video("first.mp4"));
        var second = videos.saveAndFlush(video("second.mp4"));
        var parent = comments.saveAndFlush(comment(first, "Parent"));
        var reply = comment(second, "Wrong video");
        reply.setParent(parent);
        assertThrows(DataIntegrityViolationException.class, () -> comments.saveAndFlush(reply));
    }
}
