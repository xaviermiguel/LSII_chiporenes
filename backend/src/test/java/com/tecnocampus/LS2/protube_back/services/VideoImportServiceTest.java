package com.tecnocampus.LS2.protube_back.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tecnocampus.LS2.protube_back.model.Comment;
import com.tecnocampus.LS2.protube_back.model.Video;
import com.tecnocampus.LS2.protube_back.repository.CommentRepository;
import com.tecnocampus.LS2.protube_back.repository.VideoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static com.tecnocampus.LS2.protube_back.services.ImportFixtures.*;

@DataJpaTest(properties = {"spring.jpa.hibernate.ddl-auto=create-drop", "spring.flyway.enabled=false"})
@ActiveProfiles("test")
@Import({VideoImportService.class, VideoGrabberReader.class, ObjectMapper.class})
@Transactional(propagation = Propagation.NOT_SUPPORTED)
public class VideoImportServiceTest {
    @TempDir Path store;
    @Autowired VideoImportService importer;
    @Autowired VideoRepository videos;
    @Autowired CommentRepository comments;

    @BeforeEach
    void setup() throws IOException {
        // Isolated test database only; no application data or real media is touched.
        comments.deleteAllInBatch();
        videos.deleteAllInBatch();
        store(store, 3);
    }

    @Test
    void repeatedImportPreservesDataAndDoesNotDuplicateVideosOrComments() throws IOException {
        var first = importer.importDirectory(store, 2, null);
        assertEquals(3, first.addedVideos());
        assertEquals(2, first.addedComments());
        assertEquals(0, first.noCommentsSourceId());
        var video = videos.findByVideoPath("1.mp4").orElseThrow();
        var comment = comments.findByVideoIdOrderByCreatedAtAscIdAsc(video.getId()).getFirst();
        video.setTitle("User edited title");
        videos.saveAndFlush(video);
        comment.setText("User edited comment");
        comments.saveAndFlush(comment);
        var second = importer.importDirectory(store, 2, null);
        assertEquals(0, second.addedVideos());
        assertEquals(0, second.addedComments());
        assertEquals(3, second.unchangedVideos());
        assertEquals(3, videos.count());
        assertEquals(2, comments.count());
        assertEquals("User edited title", videos.findById(video.getId()).orElseThrow().getTitle());
        assertEquals("User edited comment", comments.findById(comment.getId()).orElseThrow().getText());
        assertTrue(comments.findByVideoIdOrderByCreatedAtAscIdAsc(videos.findByVideoPath("0.mp4").orElseThrow().getId()).isEmpty());
        assertFalse(importer.usesPostgres());
    }

    @Test
    void deduplicatesRepeatedSourceCommentsAndRecognizesOlderCommentsWithoutKeys() throws IOException {
        var data = data(1);
        var array = (com.fasterxml.jackson.databind.node.ArrayNode) data.path("meta").path("comments");
        array.add(array.get(0).deepCopy());
        write(store, 1, data);
        importer.importDirectory(store, 2, null);
        assertEquals(2, comments.count());
        var comment = comments.findAll().getFirst();
        comment.setSourceMetadata(Map.of());
        comments.saveAndFlush(comment);
        assertEquals(0, importer.importDirectory(store, 2, null).addedComments());
    }

    @Test
    void invalidJsonCausesNoDatabaseWrites() throws IOException {
        Files.writeString(store.resolve("2.json"), "{");
        assertThrows(IOException.class, () -> importer.importDirectory(store, 2, null));
        assertEquals(0, videos.count());
        assertEquals(0, comments.count());
    }

    @Test
    void conflictingEmptyCaseRollsBackEntireLoadWithoutDeletingExistingComments() throws IOException {
        var existing = new Video();
        existing.setTitle("Existing");
        existing.setDescription("Existing description");
        existing.setExternalAuthor("Channel");
        existing.setVideoPath("2.mp4");
        existing.setThumbnailPath("2.webp");
        existing.setSourceMetadata(Map.of("video_grabber_id", 2));
        videos.saveAndFlush(existing);
        var comment = new Comment();
        comment.setVideo(existing);
        comment.setText("Keep me");
        comment.setExternalAuthor("Existing author");
        comment.setCreatedAt(Instant.parse("2026-10-14T11:00:00Z"));
        comments.saveAndFlush(comment);
        assertThrows(IllegalStateException.class, () -> importer.importDirectory(store, 2, 2L));
        assertEquals(1, videos.count());
        assertEquals(1, comments.count());
        assertEquals("Keep me", comments.findById(comment.getId()).orElseThrow().getText());
    }

    @Test
    void rejectsPathsAlreadyUsedByUnrelatedVideos() {
        var video = new Video();
        video.setTitle("Uploaded video");
        video.setDescription("Existing");
        video.setExternalAuthor("Owner");
        video.setVideoPath("0.mp4");
        video.setThumbnailPath("0.webp");
        videos.saveAndFlush(video);
        assertThrows(IllegalStateException.class, () -> importer.importDirectory(store, 2, null));
        assertEquals(1, videos.count());
        assertEquals(0, comments.count());
    }
}
