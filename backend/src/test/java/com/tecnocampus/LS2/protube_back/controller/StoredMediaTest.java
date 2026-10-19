package com.tecnocampus.LS2.protube_back.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {"pro_tube.import.enabled=false", "pro_tube.load_initial_data=false"})
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
    void servesConfiguredVideoAndThumbnailFromDirectoryContainingSpaces() throws Exception {
        mvc.perform(get("/media/2.mp4")).andExpect(status().isOk())
                .andExpect(content().bytes(new byte[]{1, 2, 3}));
        mvc.perform(get("/media/2.webp")).andExpect(status().isOk())
                .andExpect(content().bytes(new byte[]{4, 5, 6}));
        mvc.perform(get("/media/2.mp4").header("Range", "bytes=1-2"))
                .andExpect(status().isPartialContent()).andExpect(content().bytes(new byte[]{2, 3}));
    }
}
