package com.tecnocampus.LS2.protube_back.services;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.io.TempDir;
import com.tecnocampus.LS2.protube_back.model.Video;
import com.tecnocampus.LS2.protube_back.repository.VideoRepository;
import com.tecnocampus.LS2.protube_back.repository.CommentRepository;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.nio.file.Path;
import java.nio.file.Files;
import java.io.IOException;

import com.tecnocampus.LS2.protube_back.model.Comment;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.SliceImpl;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class VideoServiceTest {

    VideoRepository repository = mock(VideoRepository.class);
    CommentRepository commentRepository = mock(CommentRepository.class);

    @TempDir
    Path store;

    VideoService videoService;

    @BeforeEach
    void setUp() {
        videoService = new VideoService(
                repository,
                commentRepository,
                store.toString());
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

        var page = PageRequest.of(0, 12);

        when(repository.findAllByOrderByIdAsc(page)).thenReturn(
                new SliceImpl<>(List.of(first, second), page, false));

        var result = videoService.getVideos(0, 12);

        assertEquals(2, result.items().size());
        assertEquals("First video", result.items().get(0).title());
        assertEquals("Second video", result.items().get(1).title());

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
        when(repository.findById(42L)).thenReturn(Optional.empty());

        assertThrows(
                VideoNotFoundException.class,
                () -> videoService.getVideo(42L));

        verifyNoInteractions(commentRepository);
    }

    @Test
    void rejectsMissingDirectoryOutsidePathsAndInvalidFilePaths() {
        var video = new Video();

        when(repository.findById(42L)).thenReturn(Optional.of(video));

        for (String path : List.of(
                "absent.mp4",
                "../outside.mp4",
                store.resolve("absolute.mp4").toString(),
                "invalid\u0000.mp4")) {

            video.setVideoPath(path);

            assertThrows(
                    VideoNotFoundException.class,
                    () -> videoService.getVideo(42L));
        }

        video.setVideoPath("");

        assertThrows(
                VideoNotFoundException.class,
                () -> videoService.getVideo(42L));

        verifyNoInteractions(commentRepository);
    }

    @Test
    void returnsDetailWithImportedTagsAndComments() throws IOException {
        Files.writeString(store.resolve("1.mp4"), "fake video");

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

        when(repository.findById(45L)).thenReturn(Optional.of(video));

        when(commentRepository.findByVideoIdOrderByCreatedAtAscIdAsc(45L))
                .thenReturn(List.of(comment));

        var detail = videoService.getVideo(45L);

        assertEquals(45L, detail.id());
        assertEquals("Original description", detail.description());
        assertEquals("/media/1.mp4", detail.videoUrl());
        assertEquals(List.of("music", "live"), detail.tags());
        assertEquals(1, detail.comments().size());
        assertEquals("External author", detail.comments().getFirst().user());
        assertEquals("Original comment", detail.comments().getFirst().text());
        assertEquals(
                comment.getCreatedAt(),
                detail.comments().getFirst().createdAt());
    }

    @Test
    void returnsEmptyTagsAndCommentsWhenAbsent() throws IOException {
        Files.writeString(store.resolve("1.mp4"), "fake video");

        var video = new Video();
        video.setId(1L);
        video.setVideoPath("1.mp4");
        video.setThumbnailPath("1.webp");

        when(repository.findById(1L)).thenReturn(Optional.of(video));

        when(commentRepository.findByVideoIdOrderByCreatedAtAscIdAsc(1L))
                .thenReturn(List.of());

        var detail = videoService.getVideo(1L);

        assertTrue(detail.tags().isEmpty());
        assertTrue(detail.comments().isEmpty());
    }

    @Test
    void missingVideoReturns404WithoutQueryingComments() {
        when(repository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(
                VideoNotFoundException.class,
                () -> videoService.getVideo(999L));

        verifyNoInteractions(commentRepository);
    }
}
