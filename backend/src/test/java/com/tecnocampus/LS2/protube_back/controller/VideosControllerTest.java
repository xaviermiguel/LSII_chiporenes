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
        when(videoService.getVideos()).thenReturn(List.of("video 1", "video 2"));
        assertEquals(List.of("video 1", "video 2"), videosController.getVideos().getBody());
    }
}