package com.tecnocampus.LS2.protube_back.services;

import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class VideoService {

    public List<String> getVideos() {

        return List.of("video1", "video2");
    }
}
