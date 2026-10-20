package com.tecnocampus.LS2.protube_back.controller;

import com.tecnocampus.LS2.protube_back.dto.video.VideoDetailResponse;
import com.tecnocampus.LS2.protube_back.services.VideoService;
import com.tecnocampus.LS2.protube_back.services.VideoNotFoundException;
import com.tecnocampus.LS2.protube_back.dto.ApiError;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.bind.annotation.ExceptionHandler;

@RestController
@RequestMapping("/api/videos")
public class VideosController {

    @Autowired
    VideoService videoService;

    @GetMapping("")
    public ResponseEntity<?> getVideos(@RequestParam(defaultValue = "0") int page,
                                       @RequestParam(defaultValue = "12") int size) {
        if (page < 0 || size < 1 || size == Integer.MAX_VALUE) {
            return invalidPagination();
        }
        return ResponseEntity.ok(videoService.getVideos(page, size));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiError> invalidPaginationType(MethodArgumentTypeMismatchException exception) {
        if (!"page".equals(exception.getName()) && !"size".equals(exception.getName())) {
            throw exception;
        }
        return invalidPagination();
    }
    private ResponseEntity<ApiError> invalidPagination() {
        return ResponseEntity.badRequest().body(new ApiError("INVALID_PAGINATION",
                "page must be a nonnegative integer and size a positive integer below 2147483647."));
    }
    @GetMapping("/{id}")
    public ResponseEntity<VideoDetailResponse> getVideoId(@PathVariable Long id) {
        return ResponseEntity.ok(videoService.getVideoById(id));
    }
    @ExceptionHandler(VideoNotFoundException.class)
    public ResponseEntity<ApiError> videoNotFound(VideoNotFoundException exception) {
        return ResponseEntity.status(404).body(new ApiError("VIDEO_NOT_FOUND", exception.getMessage()));
    }
}
