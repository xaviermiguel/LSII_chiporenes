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
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

class VideoServiceTest {

    VideoRepository repository = mock(VideoRepository.class);
    CommentRepository comments = mock(CommentRepository.class);
    @TempDir Path store;
    VideoService videoService;

    @BeforeEach
    void setUp() {
        videoService = new VideoService(repository, comments, store.toString());
    }

    @Test
    void readsStoredTitlesWithoutChangingTheApiContract() {
        var first = new Video();
        first.setTitle("First video");
        var second = new Video();
        second.setTitle("Second video");
        when(repository.findAllByOrderByIdAsc()).thenReturn(List.of(first, second));
        assertEquals(List.of("First video", "Second video"), videoService.getVideos());
        verify(repository).findAllByOrderByIdAsc();
    }

    @Test
    void returnsEmptyCatalogWithoutInventingData() {
        when(repository.findAllByOrderByIdAsc()).thenReturn(List.of());
        assertEquals(List.of(), videoService.getVideos());
    }

    @Test
    void rejectsMissingVideoBeforeReadingComments() {
        when(repository.findById(42L)).thenReturn(Optional.empty());
        assertThrows(VideoNotFoundException.class, () -> videoService.getVideo(42L));
        verifyNoInteractions(comments);
    }

    @Test
    void rejectsMissingDirectoryOutsidePathsAndInvalidFilePaths() {
        var video = new Video();
        when(repository.findById(42L)).thenReturn(Optional.of(video));
        for (String path : List.of("absent.mp4", "../outside.mp4", store.resolve("absolute.mp4").toString(),
                "invalid\u0000.mp4")) {
            video.setVideoPath(path);
            assertThrows(VideoNotFoundException.class, () -> videoService.getVideo(42L));
        }
        video.setVideoPath(""); // A directory is not a playable video file.
        assertThrows(VideoNotFoundException.class, () -> videoService.getVideo(42L));
        verifyNoInteractions(comments);
    }

    @Test
    void buildsUrlsFromStoredPathsAndReadsCommentsByPersistedId() throws Exception {
        Files.write(store.resolve("8701.mp4"), new byte[]{1, 2, 3});
        var video = new Video();
        video.setId(42L);
        video.setVideoPath("8701.mp4");
        video.setThumbnailPath("8701.webp");
        when(repository.findById(42L)).thenReturn(Optional.of(video));
        when(comments.findByVideoIdOrderByCreatedAtAscIdAsc(42L)).thenReturn(List.of());

        var response = videoService.getVideo(42L);
        assertEquals("/media/8701.mp4", response.videoUrl());
        assertEquals("/media/8701.webp", response.thumbnailUrl());
        assertEquals(List.of(), response.comments());
        verify(comments).findByVideoIdOrderByCreatedAtAscIdAsc(42L);
    }
}
