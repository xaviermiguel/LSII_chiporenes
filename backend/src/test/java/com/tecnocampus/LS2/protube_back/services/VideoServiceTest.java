package com.tecnocampus.LS2.protube_back.services;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.io.TempDir;
import com.tecnocampus.LS2.protube_back.model.Video;
import com.tecnocampus.LS2.protube_back.repository.VideoRepository;
import com.tecnocampus.LS2.protube_back.repository.CommentRepository;

import com.tecnocampus.LS2.protube_back.repository.CommentRepository;
import com.tecnocampus.LS2.protube_back.dto.video.VideoSummaryResponse;

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
    VideoService videoService = new VideoService(
            repository,
            commentRepository);

    @BeforeEach
    void setUp() {
        videoService = new VideoService(repository, comments, store.toString());
    }

    @Test
    void returnsStoredVideoSummaries() {
        var first = new Video();
        first.setTitle("First video");
        first.setId(10L);
        first.setThumbnailPath("covers/first #1.webp");
        var second = new Video();
        second.setTitle("Second video");
        when(repository.findAllByOrderByIdAsc()).thenReturn(List.of(first, second));
        assertEquals(
                List.of(
                        new VideoSummaryResponse(
                                null,"First video",null, null,null
                        ),
                        new VideoSummaryResponse(
                                null, "Second video", null, null, null
                        )
                ), videoService.getVideos());
        verify(repository).findAllByOrderByIdAsc();
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
    void returnsDetailWithImportedTagsAndComments() {
        var video = new Video();
        video.setId(45L);
        video.setTitle("Stored video");
        video.setDescription("Original description");
        video.setVideoPath("1.mp4");
        video.setSourceMetadata(Map.of("tags", List.of("music", 42, "live")));
        var comment = new Comment();
        comment.setId(349L);
        comment.setExternalAuthor("External author");
        comment.setText("Original comment");
        when(repository.findById(45L)).thenReturn(Optional.of(video));
        when(commentRepository.findByVideoIdOrderByCreatedAtAscIdAsc(45L))
                .thenReturn(List.of(comment));

        var detail = videoService.getVideoById(45L);

        assertEquals(45L, detail.id());
        assertEquals("Original description", detail.description());
        assertEquals("1.mp4", detail.videoUrl());
        assertEquals(List.of("music", "live"), detail.tags());
        assertEquals(1, detail.comments().size());
        assertEquals("External author", detail.comments().getFirst().author());
        assertEquals("Original comment", detail.comments().getFirst().text());
        assertEquals(comment.getCreatedAt(), detail.comments().getFirst().createdAt());
    }

    @Test
    void returnsEmptyTagsAndCommentsWhenAbsent() {
        var video = new Video();
        when(repository.findById(1L)).thenReturn(Optional.of(video));
        when(commentRepository.findByVideoIdOrderByCreatedAtAscIdAsc(1L))
                .thenReturn(List.of());

        var detail = videoService.getVideoById(1L);

        assertTrue(detail.tags().isEmpty());
        assertTrue(detail.comments().isEmpty());
    }

    @Test
    void missingVideoReturns404WithoutQueryingComments() {
        when(repository.findById(999L)).thenReturn(Optional.empty());

        var exception = assertThrows(ResponseStatusException.class,
                () -> videoService.getVideoById(999L));

        assertEquals(404, exception.getStatusCode().value());
        verifyNoInteractions(commentRepository);
    }

}
