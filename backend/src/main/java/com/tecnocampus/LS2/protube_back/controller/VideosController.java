package com.tecnocampus.LS2.protube_back.controller;

import com.tecnocampus.LS2.protube_back.dto.video.*;
import com.tecnocampus.LS2.protube_back.mapper.VideoMapper;
import com.tecnocampus.LS2.protube_back.services.VideoService;
import com.tecnocampus.LS2.protube_back.services.VideoUploadService;
import com.tecnocampus.LS2.protube_back.services.exceptions.VideoAccessDeniedException;
import com.tecnocampus.LS2.protube_back.services.exceptions.VideoNotFoundException;
import com.tecnocampus.LS2.protube_back.dto.ApiError;
import com.tecnocampus.LS2.protube_back.services.exceptions.VideoUpdateException;
import com.tecnocampus.LS2.protube_back.services.exceptions.VideoUploadException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.net.URI;

@RestController
@RequestMapping("/api/videos")
public class VideosController {

    @Autowired
    VideoService videoService;
    @Autowired
    private VideoUploadService videoUploadService;

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

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<VideoUploadResponse> uploadVideo(
            @AuthenticationPrincipal Long ownerId,
            @ModelAttribute VideoUploadRequest request
    ) {
        // Llamaremos al servicio y construiremos la respuesta.
        var video = videoUploadService.uploadVideo(
                ownerId,
                request.title(),
                request.description(),
                request.video(),
                request.thumbnail()
        );
        var response =VideoMapper.toUploadResponse(video);
        return  ResponseEntity.created(URI.create("/api/videos/" + video.getId())).body(response);
    }
    @ExceptionHandler(VideoUploadException.class)
    public ResponseEntity<ApiError> invalidVideoUpload(
            VideoUploadException exception
    ) {
        return ResponseEntity.badRequest().body(
                new ApiError("INVALID_VIDEO_UPLOAD", exception.getMessage())
        );
    }
    @GetMapping("/me")
    public ResponseEntity<VideoPage> getMyVideos(
            @AuthenticationPrincipal Long ownerId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size
    ) {
        if (page < 0 || size < 1 || size == Integer.MAX_VALUE) {
            return ResponseEntity.badRequest().build();
        }

        return ResponseEntity.ok(
                videoService.getMyVideos(ownerId, page, size)
        );
    }
    @PatchMapping(
            value = "/{id}",
            consumes = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<VideoUploadResponse> updateVideo(
            @PathVariable Long id,
            @AuthenticationPrincipal Long ownerId,
            @RequestBody VideoUpdateRequest request
    ) {
        return ResponseEntity.ok(
                videoService.updateVideo(id, ownerId, request)
        );
    }
    @ExceptionHandler(VideoUpdateException.class)
    public ResponseEntity<ApiError> invalidVideoUpdate(
            VideoUpdateException exception
    ) {
        return ResponseEntity.badRequest().body(
                new ApiError("INVALID_VIDEO_UPDATE", exception.getMessage())
        );
    }

    @ExceptionHandler(VideoAccessDeniedException.class)
    public ResponseEntity<ApiError> videoAccessDenied(
            VideoAccessDeniedException exception
    ) {
        return ResponseEntity.status(403).body(
                new ApiError("VIDEO_ACCESS_DENIED", exception.getMessage())
        );
    }
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteVideo(
            @PathVariable Long id,
            @AuthenticationPrincipal Long ownerId
    ) {
        videoService.deleteVideo(id, ownerId);
        return ResponseEntity.noContent().build();
    }




}
