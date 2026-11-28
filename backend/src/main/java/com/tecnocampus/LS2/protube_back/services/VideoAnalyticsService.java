package com.tecnocampus.LS2.protube_back.services;

import com.tecnocampus.LS2.protube_back.repository.VideoAnalyticsRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class VideoAnalyticsService {
    private final VideoAnalyticsRepository repository;

    public VideoAnalyticsService(VideoAnalyticsRepository repository) {
        this.repository = repository;
    }

    public record VideoMetrics(long id, String title, long views, long comments) {}
    public record Analytics(long views, long comments, List<VideoMetrics> videos) {}

    @Transactional(readOnly = true)
    public Analytics forOwner(long ownerId) {
        var videos = repository.findForOwner(ownerId).stream()
                .map(row -> new VideoMetrics(row.getId(), row.getTitle(), row.getViews(), row.getComments()))
                .toList();
        return new Analytics(
                videos.stream().mapToLong(VideoMetrics::views).sum(),
                videos.stream().mapToLong(VideoMetrics::comments).sum(),
                videos);
    }

    @Transactional
    public boolean recordView(long videoId, long viewerId) {
        return repository.recordView(videoId, viewerId) == 1;
    }
}