package com.tecnocampus.LS2.protube_back.controller;

import com.tecnocampus.LS2.protube_back.dto.ApiError;
import com.tecnocampus.LS2.protube_back.services.VideoAnalyticsService;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/videos")
public class VideoAnalyticsController {
    private final VideoAnalyticsService analytics;

    public VideoAnalyticsController(VideoAnalyticsService analytics) {
        this.analytics = analytics;
    }

    @GetMapping("/me/analytics")
    public ResponseEntity<VideoAnalyticsService.Analytics> ownAnalytics(@AuthenticationPrincipal Long ownerId) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(analytics.forOwner(ownerId));
    }

    @PostMapping("/{id}/views")
    public ResponseEntity<?> recordView(@PathVariable long id, @AuthenticationPrincipal Long viewerId) {
        if (!analytics.recordView(id, viewerId)) {
            return ResponseEntity.status(404).body(new ApiError("VIDEO_NOT_FOUND", "El vídeo solicitado no existe."));
        }
        return ResponseEntity.noContent().build();
    }
}