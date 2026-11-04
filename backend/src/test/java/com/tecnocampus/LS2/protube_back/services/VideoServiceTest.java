package com.tecnocampus.LS2.protube_back.services;

import com.tecnocampus.LS2.protube_back.services.exceptions.VideoNotFoundException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.io.TempDir;
import com.tecnocampus.LS2.protube_back.model.Video;
import com.tecnocampus.LS2.protube_back.model.User;
import com.tecnocampus.LS2.protube_back.repository.VideoRepository;
import com.tecnocampus.LS2.protube_back.repository.CommentRepository;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import com.tecnocampus.LS2.protube_back.model.Comment;


import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class VideoServiceTest {

    VideoRepository repository = mock(VideoRepository.class);
    CommentRepository commentRepository = mock(CommentRepository.class);
    @TempDir Path store;
    VideoService videoService;
    User owner;

    @BeforeEach
    void setUp() {
        videoService = new VideoService(repository, commentRepository,store.toString());
        owner = new User();
        owner.setId(1L);
        owner.setEmail("owner@example.test");
        owner.setDisplayName("Test owner");

    }

    @Test
    void paginatesOnlyVideosWithBothFiles() throws Exception {
        Files.createDirectories(store.resolve("covers"));
        Files.write(store.resolve("covers/first #1.webp"), new byte[]{1});
        Files.write(store.resolve("video.mp4"), new byte[]{1});
        Files.createFile(store.resolve("empty.webp"));

        var first = catalogVideo(10L, "video.mp4", "covers/first #1.webp");
        var missingVideo = catalogVideo(11L, "missing.mp4", "covers/first #1.webp");
        var missingCover = catalogVideo(12L, "video.mp4", "missing.webp");
        var emptyCover = catalogVideo(13L, "video.mp4", "empty.webp");
        var second = catalogVideo(14L, "video.mp4", "covers/first #1.webp");
        when(repository.findAllByOrderByIdAsc())
                .thenReturn(List.of(first, missingVideo, missingCover, emptyCover, second));

        var firstPage = videoService.getVideos(0, 1);
        assertEquals(10L, firstPage.items().getFirst().id());
        assertEquals("/media/covers/first%20%231.webp", firstPage.items().getFirst().thumbnailUrl());
        assertTrue(firstPage.hasNext());

        var secondPage = videoService.getVideos(1, 1);
        assertEquals(14L, secondPage.items().getFirst().id());
        assertFalse(secondPage.hasNext());
    }

    private Video catalogVideo(long id, String videoPath, String thumbnailPath) {
        var video = new Video();
        video.setId(id);
        video.setOwner(owner);
        video.setVideoPath(videoPath);
        video.setThumbnailPath(thumbnailPath);
        return video;
    }

    @Test
    void returnsEmptyCatalogWithoutInventingData() {
        when(repository.findAllByOrderByIdAsc()).thenReturn(List.of());
        var result = videoService.getVideos(0, 12);
        assertEquals(List.of(), result.items());
        assertFalse(result.hasNext());
    }

    @Test
    void rejectsMissingVideoBeforeReadingComments() {
        when(repository.findById(42L))
                .thenReturn(Optional.empty());

        assertThrows(
                VideoNotFoundException.class,
                () -> videoService.getVideoById(42L));

        verifyNoInteractions(commentRepository);
    }

    @Test
    void returnsDetailWithImportedTagsAndComments() throws Exception {
        Files.write(store.resolve("1.mp4"), new byte[]{1, 2, 3});

        var video = new Video();
        video.setOwner(owner);
        video.setId(45L);
        video.setTitle("Stored video");
        video.setDescription("Original description");
        video.setVideoPath("1.mp4");
        video.setThumbnailPath("1.webp");
        video.setSourceMetadata(Map.of(
                "tags", List.of("music", 42, "live")));

        var comment = new Comment();
        comment.setId(349L);
        comment.setExternalAuthor("External author");
        comment.setText("Original comment");

        when(repository.findById(45L))
                .thenReturn(Optional.of(video));

        when(commentRepository.findByVideoIdOrderByCreatedAtAscIdAsc(45L))
                .thenReturn(List.of(comment));

        var detail = videoService.getVideoById(45L);

        assertEquals(45L, detail.id());
        assertEquals("Original description", detail.description());
        assertEquals("/media/1.mp4", detail.videoUrl());
        assertEquals(List.of("music", "live"), detail.tags());
        assertEquals(1, detail.comments().size());
        assertEquals("External author", detail.comments().getFirst().user());
        assertEquals("Original comment", detail.comments().getFirst().text());
        assertEquals(comment.getCreatedAt(), detail.comments().getFirst().createdAt());
    }
    @Test
    void returnsEmptyTagsAndCommentsWhenAbsent() throws Exception {
        Files.write(store.resolve("1.mp4"), new byte[]{1, 2, 3});

        var video = new Video();
        video.setOwner(owner);
        video.setId(1L);
        video.setVideoPath("1.mp4");
        video.setThumbnailPath("1.webp");
        video.setSourceMetadata(Map.of());

        when(repository.findById(1L))
                .thenReturn(Optional.of(video));

        when(commentRepository.findByVideoIdOrderByCreatedAtAscIdAsc(1L))
                .thenReturn(List.of());

        var detail = videoService.getVideoById(1L);

        assertTrue(detail.tags().isEmpty());
        assertTrue(detail.comments().isEmpty());
    }

    @Test
    void authorSelectionIsConsistentForSummaryAndDetail() throws Exception {
        Files.write(store.resolve("author.mp4"), new byte[]{1});
        var video = new Video();
        video.setOwner(owner);
        video.setId(91L);
        video.setVideoPath("author.mp4");
        video.setThumbnailPath("author.webp");
        video.setExternalAuthor("Original channel");
        Files.write(store.resolve("author.webp"), new byte[]{1});
        when(repository.findAllByOrderByIdAsc()).thenReturn(List.of(video));
        when(repository.findById(91L)).thenReturn(Optional.of(video));
        when(commentRepository.findByVideoIdOrderByCreatedAtAscIdAsc(91L)).thenReturn(List.of());

        // Normal owners retain their public name even if imported metadata exists.
        assertAuthor("Test owner");
        // Only the reserved account selects the external author, case-insensitively.
        owner.setEmail("DEMO@PROTUBE.INVALID");
        owner.setDisplayName("ProTube Demo");
        assertAuthor("Original channel");
        video.setExternalAuthor(null);
        assertAuthor("ProTube Demo");
        video.setExternalAuthor("   ");
        assertAuthor("ProTube Demo");
    }

    private void assertAuthor(String expected) {
        assertEquals(expected, videoService.getVideos(0, 12).items().getFirst().user());
        assertEquals(expected, videoService.getVideoById(91L).user());
    }

    @Test
    void missingVideoReturns404WithoutQueryingComments() {
        when(repository.findById(999L))
                .thenReturn(Optional.empty());

        assertThrows(
                VideoNotFoundException.class,
                () -> videoService.getVideoById(999L));

        verifyNoInteractions(commentRepository);
    }
}
