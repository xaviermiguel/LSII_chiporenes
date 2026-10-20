package com.tecnocampus.LS2.protube_back.services;

import com.tecnocampus.LS2.protube_back.dto.video.CommentResponse;
import com.tecnocampus.LS2.protube_back.dto.video.VideoDetailResponse;
import com.tecnocampus.LS2.protube_back.dto.video.VideoSummaryResponse;
import com.tecnocampus.LS2.protube_back.repository.CommentRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.tecnocampus.LS2.protube_back.repository.VideoRepository;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class VideoService {
    private final VideoRepository videoRepository;
    private final CommentRepository commentRepository;

    public VideoService(VideoRepository videoRepository,
                        CommentRepository commentRepository) {
        this.videoRepository = videoRepository;
        this.commentRepository = commentRepository;
    }

    @Transactional(readOnly = true)
    public List<VideoSummaryResponse> getVideos() {
        return videoRepository.findAllByOrderByIdAsc()
                .stream()
                .map(video -> new VideoSummaryResponse(
                        video.getId(),
                        video.getTitle(),
                        video.getExternalAuthor(),
                        video.getDurationSeconds(),
                        video.getThumbnailPath()
                ))
                .toList();
    }
    @Transactional(readOnly = true)
    public VideoDetailResponse getVideoById(Long id) {
        var video = videoRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Vídeo no encontrado"
                ));

        Object sourceTags = video.getSourceMetadata().get("tags");

        List<String> tags = sourceTags instanceof List<?> values
                ? values.stream()
                .filter(String.class::isInstance)
                .map(String.class::cast)
                .toList()
                : List.of();

        List<CommentResponse> comments = commentRepository
                .findByVideoIdOrderByCreatedAtAscIdAsc(id)
                .stream()
                .map(comment -> new CommentResponse(
                        comment.getId(),
                        comment.getExternalAuthor(),
                        comment.getText(),
                        comment.getCreatedAt()
                ))
                .toList();

        return new VideoDetailResponse(
                video.getId(),
                video.getTitle(),
                video.getExternalAuthor(),
                video.getDurationSeconds(),
                video.getThumbnailPath(),
                video.getDescription(),
                video.getVideoPath(),
                tags,
                comments
        );
    }
}

