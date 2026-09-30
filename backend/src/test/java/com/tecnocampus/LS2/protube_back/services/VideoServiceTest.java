package com.tecnocampus.LS2.protube_back.services;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class VideoServiceTest {

    VideoService videoService = new VideoService();


    @Test
    void shouldGoToFolderVideos() {
        assertEquals(List.of("video1", "video2"), videoService.getVideos());
    }

}