package com.tecnocampus.LS2.protube_back.services;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.io.TempDir;
import com.tecnocampus.LS2.protube_back.model.Video;
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

    @BeforeEach
    void setUp() {
        videoService = new VideoService(repository, commentRepository,store.toString());

    }

    @Test
    void readsStoredSummariesUsingDatabasePagination() {
        var first = new Video();
        first.setTitle("First video");
        first.setId(10L);
        first.setThumbnailPath("covers/first #1.webp");
        var second = new Video();
        second.setTitle("Second video");
        second.setThumbnailPath("second.webp");
        var page = org.springframework.data.domain.PageRequest.of(0, 2);
        when(repository.findAllByOrderByIdAsc(page)).thenReturn(
                new org.springframework.data.domain.SliceImpl<>(List.of(first, second), page, true));
        var result = videoService.getVideos(0, 2);
        assertEquals(List.of("First video", "Second video"), result.items().stream().map(
                com.tecnocampus.LS2.protube_back.dto.video.VideoSummary::title).toList());
        assertEquals(10L, result.items().getFirst().id());
        assertEquals("/media/covers/first%20%231.webp", result.items().getFirst().thumbnailUrl());
        org.junit.jupiter.api.Assertions.assertTrue(result.hasNext());
        verify(repository).findAllByOrderByIdAsc(page);
    }

    @Test
    void returnsEmptyCatalogWithoutInventingData() {
        var page = org.springframework.data.domain.PageRequest.of(0, 12);
        when(repository.findAllByOrderByIdAsc(page)).thenReturn(
                new org.springframework.data.domain.SliceImpl<>(List.of(), page, false));
        var result = videoService.getVideos(0, 12);
        assertEquals(List.of(), result.items());
        org.junit.jupiter.api.Assertions.assertFalse(result.hasNext());
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
    void missingVideoReturns404WithoutQueryingComments() {
        when(repository.findById(999L))
                .thenReturn(Optional.empty());

        assertThrows(
                VideoNotFoundException.class,
                () -> videoService.getVideoById(999L));

        verifyNoInteractions(commentRepository);
    }
}
