package com.tecnocampus.LS2.protube_back.controller;

import com.tecnocampus.LS2.protube_back.model.User;
import com.tecnocampus.LS2.protube_back.model.Video;
import com.tecnocampus.LS2.protube_back.repository.UserRepository;
import com.tecnocampus.LS2.protube_back.repository.VideoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Anonymous HTTP requests through the real security chain, service and persisted fixtures. */
@SpringBootTest(properties = {
        "pro_tube.import.enabled=false", "pro_tube.load_initial_data=false",
        "pro_tube.store.dir=${java.io.tmpdir}",
        "spring.datasource.url=jdbc:h2:mem:video-search;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa", "spring.datasource.password=",
        "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
        "spring.jpa.hibernate.ddl-auto=create-drop", "spring.flyway.enabled=false"
})
@ActiveProfiles("test")
@AutoConfigureMockMvc
@Transactional
class VideoSearchIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired VideoRepository videos;
    @Autowired UserRepository users;
    private User owner;

    @BeforeEach
    void createOwner() {
        owner = new User();
        owner.setEmail(UUID.randomUUID() + "@example.test");
        owner.setDisplayName("Search owner");
        owner.setPasswordHash("test-placeholder");
        users.saveAndFlush(owner);
    }

    private Video video(String title, String description) {
        var video = new Video();
        video.setOwner(owner);
        video.setTitle(title);
        video.setDescription(description);
        video.setVideoPath(UUID.randomUUID() + ".mp4");
        video.setThumbnailPath("cover #1.webp");
        return videos.saveAndFlush(video);
    }

    @Test
    void ranksTitlesBeforeDescriptionsAndPaginatesStablyWithoutDuplicates() throws Exception {
        var description = video("Other", "A blue sky today");
        var first = video("BLUE SKY", "blue sky");
        var second = video("A blue sky today", "Other");
        video("Blue wide sky", "Unrelated");
        mvc.perform(get("/api/videos/search").param("q", "  blue SKY  ").param("size", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(2))
                .andExpect(jsonPath("$.items[0].id").value(first.getId().intValue()))
                .andExpect(jsonPath("$.items[0].title").value("BLUE SKY"))
                .andExpect(jsonPath("$.items[0].thumbnailUrl").value("/media/cover%20%231.webp"))
                .andExpect(jsonPath("$.items[1].id").value(second.getId().intValue()))
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(2))
                .andExpect(jsonPath("$.hasNext").value(true));
        mvc.perform(get("/api/videos/search").param("q", "blue sky").param("size", "2").param("page", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].id").value(description.getId().intValue()))
                .andExpect(jsonPath("$.page").value(1))
                .andExpect(jsonPath("$.hasNext").value(false));
        mvc.perform(get("/api/videos/search").param("q", "blue sky").param("page", "10"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items").isEmpty())
                .andExpect(jsonPath("$.hasNext").value(false));
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "   ", "\t\n", "no matches", "cafe"})
    void returnsEmptyResultsWithRequestedMetadata(String query) throws Exception {
        video("Café", "Existing description");
        mvc.perform(get("/api/videos/search").param("q", query).param("page", "3").param("size", "50"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items").isEmpty())
                .andExpect(jsonPath("$.page").value(3)).andExpect(jsonPath("$.size").value(50))
                .andExpect(jsonPath("$.hasNext").value(false));
    }

    @Test
    void missingQueryUsesEmptyQueryAndDefaultPagination() throws Exception {
        video("Existing", "Existing");
        mvc.perform(get("/api/videos/search"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items").isEmpty())
                .andExpect(jsonPath("$.page").value(0)).andExpect(jsonPath("$.size").value(12))
                .andExpect(jsonPath("$.hasNext").value(false));
    }

    @ParameterizedTest
    @ValueSource(strings = {"%", "_", "!", "' OR 1=1 --", "\\", "Café"})
    void searchesSpecialCharactersLiterally(String query) throws Exception {
        var match = video("Literal " + query, "Other");
        video("Unrelated", "Other");
        mvc.perform(get("/api/videos/search").param("q", query))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].id").value(match.getId().intValue()))
                .andExpect(jsonPath("$.size").value(12));
    }

    @ParameterizedTest
    @ValueSource(strings = {"-1", "text", "2147483648"})
    void rejectsInvalidPages(String page) throws Exception {
        mvc.perform(get("/api/videos/search").param("page", page))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVALID_PAGINATION"))
                .andExpect(jsonPath("$.message").isString());
    }

    @ParameterizedTest
    @ValueSource(strings = {"-1", "0", "51", "2147483647", "2147483648", "text"})
    void rejectsInvalidSizesEvenForEmptyQueries(String size) throws Exception {
        mvc.perform(get("/api/videos/search").param("size", size))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVALID_PAGINATION"));
    }
}
