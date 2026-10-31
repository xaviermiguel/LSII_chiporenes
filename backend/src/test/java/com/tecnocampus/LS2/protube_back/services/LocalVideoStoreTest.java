package com.tecnocampus.LS2.protube_back.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/** Read-only, opt-in check of the downloaded store; never imports into a database. */
@EnabledIfEnvironmentVariable(named = "RUN_LOCAL_VIDEO_READER_TEST", matches = "true")
class LocalVideoStoreTest {
    @Test
    void readsRealFilesWithoutChangingThem() throws Exception {
        var directory = Path.of(System.getenv("ENV_PROTUBE_STORE_DIR"));
        Map<Path, String> originalJson = new LinkedHashMap<>();
        try (var paths = Files.list(directory)) {
            for (var path : paths.filter(file -> file.toString().endsWith(".json")).toList()) {
                originalJson.put(path, Files.readString(path));
            }
        }
        var sources = new VideoGrabberReader(new ObjectMapper()).read(directory, 12, null);
        assertTrue(sources.size() > 12);
        assertTrue(sources.stream().anyMatch(source -> source.comments().isEmpty()));
        for (var entry : originalJson.entrySet()) assertEquals(entry.getValue(), Files.readString(entry.getKey()));
        System.out.printf("Read-only store check: %d videos, %d selected comments, no-comments source ID %d%n",
                sources.size(), sources.stream().mapToInt(source -> source.comments().size()).sum(),
                sources.stream().filter(source -> source.comments().isEmpty()).findFirst().orElseThrow().sourceId());
    }
}
