package com.tecnocampus.LS2.protube_back.services;

import com.tecnocampus.LS2.protube_back.dto.video.CommentResponse;
import com.tecnocampus.LS2.protube_back.dto.video.VideoDetailResponse;
import com.tecnocampus.LS2.protube_back.model.Comment;
import com.tecnocampus.LS2.protube_back.repository.CommentRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.tecnocampus.LS2.protube_back.repository.VideoRepository;
import com.tecnocampus.LS2.protube_back.model.Video;
import org.springframework.web.util.UriUtils;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.InvalidPathException;
import java.nio.file.Path;
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
    public List<String> getVideos() {
        return videoRepository.findAllByOrderByIdAsc().stream().map(Video::getTitle).toList();
    }

    @Transactional(readOnly = true)
    public VideoDetailResponse getVideo(Long id) {
        Video video = videoRepository.findById(id).orElseThrow(VideoNotFoundException::new);
        requireVideoFile(video.getVideoPath());
        var comments = commentRepository.findByVideoIdOrderByCreatedAtAscIdAsc(video.getId())
                .stream().map(this::commentResponse).toList();
        return new VideoDetailResponse(video.getId(), video.getTitle(),
                video.getOwner() == null ? video.getExternalAuthor() : video.getOwner().getDisplayName(),
                video.getDurationSeconds(), video.getDescription(), mediaUrl(video.getThumbnailPath()),
                mediaUrl(video.getVideoPath()), comments);
    }

    private CommentResponse commentResponse(Comment comment) {
        return new CommentResponse(comment.getId(), comment.getText(),
                comment.getAuthor() == null ? comment.getExternalAuthor() : comment.getAuthor().getDisplayName(),
                comment.getCreatedAt(), comment.getParentId());
    }

    private String mediaUrl(String relativePath) {
        // Encode the stored filename as a URL path, never derive it from the database ID.
        return UriUtils.encodePath("/media/" + relativePath.replace('\\', '/'), StandardCharsets.UTF_8);
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

