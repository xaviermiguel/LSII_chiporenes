package com.tecnocampus.LS2.protube_back.services;

import com.tecnocampus.LS2.protube_back.model.User;
import com.tecnocampus.LS2.protube_back.model.Video;
import com.tecnocampus.LS2.protube_back.repository.UserRepository;
import com.tecnocampus.LS2.protube_back.repository.VideoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class VideoUploadServiceTest {
    @TempDir Path store;
    private final UserRepository users = mock(UserRepository.class);
    private final VideoRepository videos = mock(VideoRepository.class);
    private VideoUploadService service;
    private User owner;

    @BeforeEach
    void setUp() {
        owner = new User();
        owner.setId(1L);
        owner.setDisplayName("Usuario de prueba");
        when(users.findById(1L)).thenReturn(Optional.of(owner));
        service = new VideoUploadService(videos, users, store.toString());
    }

    private MockMultipartFile video() {
        return new MockMultipartFile("video", "example.mp4", "video/mp4", new byte[]{1, 2, 3});
    }

    private MockMultipartFile thumbnail() {
        return new MockMultipartFile("thumbnail", "example.jpg", "image/jpeg", new byte[]{4, 5, 6});
    }

    @Test
    void uploadsValidVideo() throws IOException {
        when(videos.saveAndFlush(any(Video.class))).thenAnswer(invocation -> {
            Video saved = invocation.getArgument(0);
            saved.setId(10L);
            return saved;
        });

        Video result = service.uploadVideo(1L, "Mi primer video", "Descripcion", video(), thumbnail());

        assertEquals(10L, result.getId());
        assertSame(owner, result.getOwner());
        assertEquals("Mi primer video", result.getTitle());
        assertEquals("Descripcion", result.getDescription());
        assertFalse(Path.of(result.getVideoPath()).isAbsolute());
        assertFalse(Path.of(result.getThumbnailPath()).isAbsolute());
        assertTrue(result.getVideoPath().endsWith(".mp4"));
        assertTrue(result.getThumbnailPath().endsWith(".jpg"));
        assertNotEquals("example.mp4", result.getVideoPath());
        assertNotEquals("example.jpg", result.getThumbnailPath());
        assertArrayEquals(video().getBytes(), Files.readAllBytes(store.resolve(result.getVideoPath())));
        assertArrayEquals(thumbnail().getBytes(), Files.readAllBytes(store.resolve(result.getThumbnailPath())));
        verify(videos).saveAndFlush(same(result));
    }

    @Test
    void removesFilesWhenDatabaseSaveFails() throws IOException {
        RuntimeException failure = new IllegalStateException("Database unavailable");
        when(videos.saveAndFlush(any(Video.class))).thenAnswer(invocation -> {
            Video pending = invocation.getArgument(0);
            assertTrue(Files.exists(store.resolve(pending.getVideoPath())));
            assertTrue(Files.exists(store.resolve(pending.getThumbnailPath())));
            throw failure;
        });
        // A failed upload must not delete unrelated catalog files.
        Path existing = Files.writeString(store.resolve("existing.mp4"), "keep");

        RuntimeException thrown = assertThrows(RuntimeException.class,
                () -> service.uploadVideo(1L, "Titulo", "Descripcion", video(), thumbnail()));

        assertSame(failure, thrown.getCause());
        try (var files = Files.list(store)) {
            assertEquals(java.util.List.of(existing), files.toList());
        }
        assertEquals("keep", Files.readString(existing));
    }

    @Test
    void removesPartialFilesWhenThumbnailWriteFails() throws IOException {
        IOException failure = new IOException("Cannot write thumbnail");
        MockMultipartFile brokenThumbnail = new MockMultipartFile(
                "thumbnail", "example.jpg", "image/jpeg", new byte[]{4}) {
            @Override
            public void transferTo(Path destination) throws IOException {
                assertTrue(Files.exists(destination.resolveSibling(
                        destination.getFileName().toString().replace(".jpg", ".mp4"))));
                Files.write(destination, new byte[]{4});
                throw failure;
            }
        };

        RuntimeException thrown = assertThrows(RuntimeException.class,
                () -> service.uploadVideo(1L, "Titulo", "Descripcion", video(), brokenThumbnail));

        assertSame(failure, thrown.getCause());
        try (var files = Files.list(store)) {
            assertEquals(0, files.count());
        }
        verifyNoInteractions(videos);
    }
}
