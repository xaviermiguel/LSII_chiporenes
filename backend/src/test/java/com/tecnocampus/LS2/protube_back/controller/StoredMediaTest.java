package com.tecnocampus.LS2.protube_back.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {
        "pro_tube.import.enabled=false",
        "pro_tube.load_initial_data=false",
        "spring.datasource.url=jdbc:h2:mem:stored-media-test;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@ActiveProfiles("dev")
@AutoConfigureMockMvc
class StoredMediaTest {
    private static final Path STORE;
    static {
        try {
            STORE = Files.createTempDirectory("protube media test ");
            Files.write(STORE.resolve("2.mp4"), new byte[]{1, 2, 3});
            Files.write(STORE.resolve("2.webp"), new byte[]{4, 5, 6});
            STORE.toFile().deleteOnExit();
            STORE.resolve("2.mp4").toFile().deleteOnExit();
            STORE.resolve("2.webp").toFile().deleteOnExit();
        } catch (IOException exception) {
            throw new ExceptionInInitializerError(exception);
        }
    }

    @DynamicPropertySource
    static void configureStore(DynamicPropertyRegistry registry) {
        registry.add("pro_tube.store.dir", STORE::toString);
    }

    @Autowired MockMvc mvc;

    @Test
    void servesConfiguredVideoAnonymouslyFromDirectoryContainingSpaces() throws Exception {
        mvc.perform(get("/media/2.mp4")).andExpect(status().isOk())
                .andExpect(content().contentType("video/mp4"))
                .andExpect(header().string(HttpHeaders.ACCEPT_RANGES, "bytes"))
                .andExpect(header().longValue(HttpHeaders.CONTENT_LENGTH, 3))
                .andExpect(content().bytes(new byte[]{1, 2, 3}));
    }

    @Test
    void servesConfiguredThumbnailAnonymously() throws Exception {
        mvc.perform(get("/media/2.webp")).andExpect(status().isOk())
                .andExpect(content().bytes(new byte[]{4, 5, 6}));
    }

    @Test
    void servesRequestedByteRangeAnonymously() throws Exception {
        mvc.perform(get("/media/2.mp4").header(HttpHeaders.RANGE, "bytes=1-2"))
                .andExpect(status().isPartialContent())
                .andExpect(content().contentType("video/mp4"))
                .andExpect(header().string(HttpHeaders.ACCEPT_RANGES, "bytes"))
                .andExpect(header().string(HttpHeaders.CONTENT_RANGE, "bytes 1-2/3"))
                .andExpect(header().longValue(HttpHeaders.CONTENT_LENGTH, 2))
                .andExpect(content().bytes(new byte[]{2, 3}));
    }

    @Test
    void rejectsRangeOutsideVideoLengthWithControlledStatus() throws Exception {
        mvc.perform(get("/media/2.mp4").header(HttpHeaders.RANGE, "bytes=3-5"))
                .andExpect(status().isRequestedRangeNotSatisfiable())
                .andExpect(header().string(HttpHeaders.CONTENT_RANGE, "bytes */3"))
                .andExpect(content().bytes(new byte[0]));
    }

    @Test
    void returnsNotFoundForMissingMediaWithoutAuthentication() throws Exception {
        mvc.perform(get("/media/missing.mp4"))
                .andExpect(status().isNotFound());
    }
}
