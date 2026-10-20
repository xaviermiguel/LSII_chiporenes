package com.tecnocampus.LS2.protube_back.services;

import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;

import static org.junit.jupiter.api.Assertions.*;
import static com.tecnocampus.LS2.protube_back.services.ImportFixtures.*;

class VideoGrabberReaderTest {
    @TempDir Path store;
    private final VideoGrabberReader reader = new VideoGrabberReader(MAPPER);

    @BeforeEach
    void prepareFiles() throws IOException {
        store(store, 3);
    }

    @Test
    void mapsMetadataAndCommentsAndCreatesEmptyCaseWithoutChangingOriginals() throws IOException {
        byte[] before = Files.readAllBytes(store.resolve("0.json"));
        var sources = reader.read(store, 2, null);
        assertEquals(3, sources.size());
        assertTrue(sources.getFirst().comments().isEmpty());
        assertArrayEquals(before, Files.readAllBytes(store.resolve("0.json")));
        var video = sources.get(1).video();
        assertEquals("1.mp4", video.getVideoPath());
        assertEquals("1.webp", video.getThumbnailPath());
        assertEquals("Vídeo de prueba", video.getTitle());
        assertEquals("Descripción", video.getDescription());
        assertEquals("Canal externo", video.getExternalAuthor());
        assertEquals(new BigDecimal("72.25"), video.getDurationSeconds());
        assertEquals(1920, video.getWidth());
        assertEquals(1080, video.getHeight());
        assertEquals(Instant.ofEpochSecond(1408396680), video.getPublishedAt());
        assertEquals(42, video.getSourceMetadata().get("view_count"));
        assertFalse(video.getSourceMetadata().containsKey("comments"));
        var comment = sources.get(1).comments().getFirst();
        assertEquals("Comentario", comment.getText());
        assertEquals("Autor", comment.getExternalAuthor());
        assertEquals(Instant.ofEpochSecond(1791356400), comment.getCreatedAt());
        assertEquals(1, comment.getSourceMetadata().get("like_count"));
    }

    @Test
    void respectsNaturalEmptyCaseAndExplicitSelection() throws IOException {
        var data = data(2);
        ((ObjectNode) data.get("meta")).remove("comments");
        write(store, 2, data);
        var natural = reader.read(store, 2, null);
        assertTrue(natural.get(2).comments().isEmpty());
        assertFalse(natural.getFirst().comments().isEmpty());
        assertTrue(reader.read(store, 2, 1L).get(1).comments().isEmpty());
        assertThrows(IllegalArgumentException.class, () -> reader.read(store, 2, 99L));
    }

    @Test
    void rejectsMissingAndEmptyMediaAndInvalidJson() throws IOException {
        Files.delete(store.resolve("1.mp4"));
        assertThrows(IOException.class, () -> reader.read(store, 2, null));
        Files.write(store.resolve("1.mp4"), new byte[]{1});
        Files.write(store.resolve("1.webp"), new byte[0]);
        assertThrows(IOException.class, () -> reader.read(store, 2, null));
        Files.write(store.resolve("1.webp"), new byte[]{1});
        Files.writeString(store.resolve("1.json"), "{");
        assertThrows(IOException.class, () -> reader.read(store, 2, null));
    }

    @Test
    void rejectsInvalidSourceFieldsBeforeImport() throws IOException {
        for (String field : new String[]{"id", "title", "user", "width", "height", "duration", "timestamp", "meta"}) {
            var data = data(1);
            data.putNull(field);
            write(store, 1, data);
            assertThrows(IOException.class, () -> reader.read(store, 2, null), field);
        }
        var mismatch = data(99);
        write(store, 1, mismatch);
        assertThrows(IOException.class, () -> reader.read(store, 2, null));
        var longTitle = data(1).put("title", "a".repeat(256));
        write(store, 1, longTitle);
        assertThrows(IOException.class, () -> reader.read(store, 2, null));
        var badComments = data(1);
        ((ObjectNode) badComments.get("meta")).put("comments", "invalid");
        write(store, 1, badComments);
        assertThrows(IOException.class, () -> reader.read(store, 2, null));
        write(store, 1, data(1).put("duration", 0));
        assertThrows(IOException.class, () -> reader.read(store, 2, null));
    }

    @Test
    void requiresMoreThanOnePageAndSomeComments() throws IOException {
        assertThrows(IllegalArgumentException.class, () -> reader.read(store, 0, null));
        assertThrows(IllegalArgumentException.class, () -> reader.read(store, 3, null));
        for (int id = 0; id < 3; id++) {
            var data = data(id);
            ((ObjectNode) data.get("meta")).putArray("comments");
            write(store, id, data);
        }
        assertThrows(IllegalArgumentException.class, () -> reader.read(store, 2, null));
    }
}
