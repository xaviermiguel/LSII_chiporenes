package com.tecnocampus.LS2.protube_back.services;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import com.tecnocampus.LS2.protube_back.model.Video;
import com.tecnocampus.LS2.protube_back.repository.VideoRepository;
import com.tecnocampus.LS2.protube_back.repository.CommentRepository;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import com.tecnocampus.LS2.protube_back.model.Comment;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class VideoServiceTest {

    VideoRepository repository = mock(VideoRepository.class);
    CommentRepository commentRepository = mock(CommentRepository.class);

    VideoService videoService;

    @BeforeEach
    void setUp() {
        videoService = new VideoService(
                repository,
                commentRepository);
    }

    @Test
    void returnsStoredVideoSummaries() {
        var first = new Video();
        first.setTitle("First video");
        first.setId(10L);
        first.setThumbnailPath("covers/first #1.webp");

        var second = new Video();
        second.setTitle("Second video");
        second.setThumbnailPath("covers/second.webp");

        when(repository.findAllByOrderByIdAsc())
                .thenReturn(List.of(first, second));

        var result = videoService.getVideos();

        assertEquals(2, result.size());
        assertEquals("First video", result.get(0).title());
        assertEquals("Second video", result.get(1).title());

        verify(repository).findAllByOrderByIdAsc();
    }

    @Test
    void returnsEmptyCatalogWithoutInventingData() {
        when(repository.findAllByOrderByIdAsc())
                .thenReturn(List.of());

        var result = videoService.getVideos();

        assertEquals(List.of(), result);
    }

    @Test
    void rejectsMissingVideoBeforeReadingComments() {
        when(repository.findById(42L))
                .thenReturn(Optional.empty());

        assertThrows(
                ResponseStatusException.class,
                () -> videoService.getVideoById(42L));

        verifyNoInteractions(commentRepository);
    }

    @Test
    void returnsDetailWithImportedTagsAndComments() {
        var video = new Video();
        video.setId(45L);
        video.setTitle("Stored video");
        video.setDescription("Original description");
        video.setVideoPath("1.mp4");
        video.setThumbnailPath("1.webp");
        video.setSourceMetadata(Map.of(
                "tags",
                List.of("music", 42, "live")));

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
        assertEquals("1.mp4", detail.videoUrl());
        assertEquals(List.of("music", "live"), detail.tags());
        assertEquals(1, detail.comments().size());
        assertEquals(
                "External author",
                detail.comments().getFirst().author());
        assertEquals(
                "Original comment",
                detail.comments().getFirst().text());
        assertEquals(
                comment.getCreatedAt(),
                detail.comments().getFirst().createdAt());
    }

    @Test
    void returnsEmptyTagsAndCommentsWhenAbsent() {
        var video = new Video();
        video.setId(1L);
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
    void missingVideoReturns404WithoutQueryingComments() {
        when(repository.findById(999L))
                .thenReturn(Optional.empty());

        var exception = assertThrows(
                ResponseStatusException.class,
                () -> videoService.getVideoById(999L));

        assertEquals(404, exception.getStatusCode().value());
        verifyNoInteractions(commentRepository);
    }
}
