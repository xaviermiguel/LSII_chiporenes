package com.tecnocampus.LS2.protube_back.controller;

import com.tecnocampus.LS2.protube_back.dto.video.VideoDetailResponse;
import com.tecnocampus.LS2.protube_back.dto.video.VideoSummaryResponse;
import com.tecnocampus.LS2.protube_back.services.VideoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/videos")
public class VideosController {

    @Autowired
    VideoService videoService;

    @GetMapping("")
    public ResponseEntity<List<VideoSummaryResponse>> getVideos() {
        return ResponseEntity.ok(videoService.getVideos());

    }
    @GetMapping ("/{id}")
    public  ResponseEntity <VideoDetailResponse> getVideosById (
            @PathVariable ("id") Long id
    ){
        return ResponseEntity.ok(videoService.getVideoById(id));
    }
}
