package com.tecnocampus.LS2.protube_back.services;

import com.tecnocampus.LS2.protube_back.model.User;
import com.tecnocampus.LS2.protube_back.model.Video;
import com.tecnocampus.LS2.protube_back.repository.CommentRepository;
import com.tecnocampus.LS2.protube_back.repository.VideoRepository;
import com.tecnocampus.LS2.protube_back.services.exceptions.AuthenticationRequiredException;
import com.tecnocampus.LS2.protube_back.services.exceptions.VideoAccessDeniedException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class VideoDeletionSafetyTest {
    @TempDir Path directory;
    private final VideoRepository videos = mock(VideoRepository.class);
    private final CommentRepository comments = mock(CommentRepository.class);

    @Test
    void rejectsMissingSessionBeforeAccessingRepositories() {
        var service = new VideoService(videos, comments, directory.toString());
        assertThrows(AuthenticationRequiredException.class, () -> service.deleteVideo(1L, null));
        verifyNoInteractions(videos, comments);
    }

    @Test
    void rejectsAnotherOwnerWithoutDeletingAnything() {
        var video = video("video.mp4", "cover.webp");
        when(videos.findById(1L)).thenReturn(Optional.of(video));
        var service = new VideoService(videos, comments, directory.toString());
        assertThrows(VideoAccessDeniedException.class, () -> service.deleteVideo(1L, 2L));
        verify(videos).findById(1L);
        verifyNoMoreInteractions(videos);
        verifyNoInteractions(comments);
    }

    @Test
    void refusesOutsidePathAndStillCleansTheValidThumbnailAfterCommit() throws Exception {
        Path store = Files.createDirectory(directory.resolve("store"));
        Path outside = Files.writeString(directory.resolve("outside.mp4"), "keep");
        Path thumbnail = Files.writeString(store.resolve("old-cover.jpg"), "delete");
        scheduleAndCommit(store, video("../outside.mp4", "old-cover.jpg"));
        assertEquals("keep", Files.readString(outside));
        assertFalse(Files.exists(thumbnail));
    }

    @Test
    void missingVideoFileDoesNotPreventThumbnailCleanup() throws Exception {
        Path thumbnail = Files.writeString(directory.resolve("cover.webp"), "delete");
        scheduleAndCommit(directory, video("already-missing.mp4", "cover.webp"));
        assertFalse(Files.exists(thumbnail));
    }

    @Test
    void fileDeletionFailureDoesNotPreventCleaningSecondFile() throws Exception {
        Path nonempty = Files.createDirectory(directory.resolve("not-a-video.mp4"));
        Files.writeString(nonempty.resolve("keep"), "keep");
        Path thumbnail = Files.writeString(directory.resolve("cover.webp"), "delete");
        assertDoesNotThrow(() -> scheduleAndCommit(directory, video("not-a-video.mp4", "cover.webp")));
        assertTrue(Files.exists(nonempty.resolve("keep")));
        assertFalse(Files.exists(thumbnail));
    }

    private void scheduleAndCommit(Path store, Video video) {
        when(videos.findById(1L)).thenReturn(Optional.of(video));
        var service = new VideoService(videos, comments, store.toString());
        // Unit test of callback behavior; real commit and rollback are integration-tested separately.
        TransactionSynchronizationManager.initSynchronization();
        try {
            service.deleteVideo(1L, 1L);
            for (TransactionSynchronization callback : TransactionSynchronizationManager.getSynchronizations()) {
                callback.afterCommit();
            }
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    private Video video(String path, String thumbnail) {
        var owner = new User();
        owner.setId(1L);
        var video = new Video();
        video.setId(1L);
        video.setOwner(owner);
        video.setVideoPath(path);
        video.setThumbnailPath(thumbnail);
        return video;
    }
}
