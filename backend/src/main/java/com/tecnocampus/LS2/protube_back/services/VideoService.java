package com.tecnocampus.LS2.protube_back.services;

import com.tecnocampus.LS2.protube_back.dto.video.CommentResponse;
import com.tecnocampus.LS2.protube_back.dto.video.VideoDetailResponse;
import com.tecnocampus.LS2.protube_back.model.Video;
import com.tecnocampus.LS2.protube_back.repository.CommentRepository;
import com.tecnocampus.LS2.protube_back.services.exceptions.VideoNotFoundException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.tecnocampus.LS2.protube_back.repository.VideoRepository;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.InvalidPathException;
import java.nio.file.Path;
import org.springframework.data.domain.PageRequest;
import com.tecnocampus.LS2.protube_back.dto.video.VideoPage;
import com.tecnocampus.LS2.protube_back.dto.video.VideoSummary;
import org.springframework.web.util.UriUtils;

import java.util.List;

@Service
public class VideoService {
    private final VideoRepository videoRepository;
    private final CommentRepository commentRepository;
    private final Path store;

    public VideoService(VideoRepository videoRepository, CommentRepository commentRepository,
                       @Value("${pro_tube.store.dir}") String storeDirectory) {
        this.videoRepository = videoRepository;
        this.commentRepository = commentRepository;
        this.store = Path.of(storeDirectory).toAbsolutePath().normalize();
    }

    @Transactional(readOnly = true)
    public VideoPage getVideos(int page, int size) {
        var videos = videoRepository.findAllByOrderByIdAsc(PageRequest.of(page, size));
        var items = videos.map(video -> new VideoSummary(video.getId(), video.getTitle(),
                displayedAuthor(video),
                video.getDurationSeconds(), mediaUrl(video.getThumbnailPath()))).getContent();
        return new VideoPage(items, page, size, videos.hasNext());
    }

    private String mediaUrl(String relativePath) {
        // Encode the stored filename as a URL path, never derive it from the database ID.
        return UriUtils.encodePath("/media/" + relativePath.replace('\\', '/'), StandardCharsets.UTF_8);
    }
    @Transactional(readOnly = true)
    public VideoDetailResponse getVideoById(Long id) {
        var video = videoRepository.findById(id).orElseThrow(VideoNotFoundException::new);
        requireVideoFile(video.getVideoPath());
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
                        comment.getText(),
                        comment.getAuthor() == null
                                ? comment.getExternalAuthor()
                                : comment.getAuthor().getDisplayName(),
                        comment.getCreatedAt(),
                        comment.getParentId()
                ))
                .toList();

        return new VideoDetailResponse(
                video.getId(),
                video.getTitle(),
                displayedAuthor(video),
                video.getDurationSeconds(),
                mediaUrl(video.getThumbnailPath()),
                video.getDescription(),
                mediaUrl(video.getVideoPath()),
                tags,
                comments
        );
    }
    private String displayedAuthor(Video video) {
        var owner = video.getOwner();
        var externalAuthor = video.getExternalAuthor();
        if ("demo@protube.invalid".equalsIgnoreCase(owner.getEmail())
                && externalAuthor != null && !externalAuthor.isBlank()) {
            return externalAuthor;
        }
        return owner.getDisplayName();
    }

    private void requireVideoFile(String relativePath) {
        try {
            Path storedPath = Path.of(relativePath);
            Path file = store.resolve(storedPath).normalize();
            if (!storedPath.isAbsolute() && file.startsWith(store) && Files.isRegularFile(file)
                    && Files.isReadable(file) && file.toRealPath().startsWith(store.toRealPath())) {
                return;
            }
        } catch (IOException | InvalidPathException exception) {
            // A missing, invalid or inaccessible resource is unavailable to the player.
        }
        throw new VideoNotFoundException("El archivo del vídeo no está disponible.");
    }


}

