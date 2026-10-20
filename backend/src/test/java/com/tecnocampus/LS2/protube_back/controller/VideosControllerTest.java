package com.tecnocampus.LS2.protube_back.controller;

import com.tecnocampus.LS2.protube_back.services.VideoService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class VideosControllerTest {

    @InjectMocks
    VideosController videosController;

    @Autowired
    @Mock
    VideoService videoService;


    @Test
    void getVideos() {
        var response = new com.tecnocampus.LS2.protube_back.dto.video.VideoPage(List.of(), 0, 12, false);
        when(videoService.getVideos(0, 12)).thenReturn(response);
        assertEquals(response, videosController.getVideos(0, 12).getBody());
    }
}
