package com.tecnocampus.LS2.protube_back.controller;

import com.tecnocampus.LS2.protube_back.services.VideoService;
import com.tecnocampus.LS2.protube_back.services.VideoNotFoundException;
import com.tecnocampus.LS2.protube_back.dto.ApiError;
import com.tecnocampus.LS2.protube_back.dto.video.VideoDetailResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
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
    public ResponseEntity<List<String>> getVideos() {
        return ResponseEntity.ok().body(videoService.getVideos());

    }

    @GetMapping("/{id}")
    public ResponseEntity<VideoDetailResponse> getVideo(@PathVariable Long id) {
        return ResponseEntity.ok(videoService.getVideo(id));
    }

    @ExceptionHandler(VideoNotFoundException.class)
    public ResponseEntity<ApiError> videoNotFound(VideoNotFoundException exception) {
        return ResponseEntity.status(404).body(new ApiError("VIDEO_NOT_FOUND", exception.getMessage()));
    }
}
