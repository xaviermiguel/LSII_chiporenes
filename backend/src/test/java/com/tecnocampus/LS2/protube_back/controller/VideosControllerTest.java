package com.tecnocampus.LS2.protube_back.controller;

import com.tecnocampus.LS2.protube_back.services.VideoService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import com.tecnocampus.LS2.protube_back.dto.video.VideoSummaryResponse;
import com.tecnocampus.LS2.protube_back.dto.video.VideoDetailResponse;
import com.tecnocampus.LS2.protube_back.dto.video.CommentResponse;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.time.Instant;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class VideosControllerTest {

    @InjectMocks
    VideosController videosController;

    @Mock
    VideoService videoService;


    @Test
    void getVideos() {
        var videos = List.of (
                new VideoSummaryResponse(
                        1L, "video1", "Author1",null,"0.webp"
                ),
                new VideoSummaryResponse(
                        2L,"video2", "Auhor 2", null,  "1.webp"
                )
        );
        when (videoService.getVideos()).thenReturn(videos);
        assertEquals(videos, videosController.getVideos().getBody());
    }

    @Test
    void detailEndpointSerializesTagsAndComments() throws Exception {
        var detail = new VideoDetailResponse(
                45L, "Video", "Author", null, "1.webp",
                "Description", "1.mp4", List.of("music"),
                List.of(new CommentResponse(349L, "Reader", "Comment", Instant.EPOCH)));
        when(videoService.getVideoById(45L)).thenReturn(detail);

        MockMvcBuilders.standaloneSetup(videosController).build()
                .perform(get("/api/videos/45"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(45))
                .andExpect(jsonPath("$.videoUrl").value("1.mp4"))
                .andExpect(jsonPath("$.tags[0]").value("music"))
                .andExpect(jsonPath("$.comments[0].text").value("Comment"));
    }

    @Test
    void detailEndpointReturns404ForMissingVideo() throws Exception {
        when(videoService.getVideoById(999L))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND));

        MockMvcBuilders.standaloneSetup(videosController).build()
                .perform(get("/api/videos/999"))
                .andExpect(status().isNotFound());
    }

}
