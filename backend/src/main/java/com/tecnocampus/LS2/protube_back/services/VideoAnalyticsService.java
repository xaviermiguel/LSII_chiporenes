package com.tecnocampus.LS2.protube_back.services;

import com.tecnocampus.LS2.protube_back.repository.VideoAnalyticsRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Service
public class VideoAnalyticsService {
    private final VideoAnalyticsRepository repository;

    public VideoAnalyticsService(VideoAnalyticsRepository repository) {
        this.repository = repository;
    }

    public record VideoMetrics(long id, String title, String thumbnailUrl, long views, long comments) {}
    public record Analytics(long views, long comments, List<VideoMetrics> videos) {}

    public enum Period {
        ALL(0), DAY(1), WEEK(7), MONTH(30);

        private final int days;
        Period(int days) { this.days = days; }
    }

    @Transactional(readOnly = true)
    public Analytics forOwner(long ownerId, Period period) {
        var end = Instant.now();
        var start = end.minus(period.days, ChronoUnit.DAYS);
        var videos = repository.findForOwner(ownerId, period == Period.ALL, start, end).stream()
                .map(row -> new VideoMetrics(row.getId(), row.getTitle(), VideoService.mediaUrl(row.getThumbnailPath()),
                        row.getViews(), row.getComments()))
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
