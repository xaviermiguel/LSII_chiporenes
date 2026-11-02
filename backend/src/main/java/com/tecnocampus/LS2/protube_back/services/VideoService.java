package com.tecnocampus.LS2.protube_back.services;

import com.tecnocampus.LS2.protube_back.dto.video.*;
import com.tecnocampus.LS2.protube_back.mapper.VideoMapper;
import com.tecnocampus.LS2.protube_back.model.Video;
import com.tecnocampus.LS2.protube_back.repository.CommentRepository;
import com.tecnocampus.LS2.protube_back.services.exceptions.*;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.tecnocampus.LS2.protube_back.repository.VideoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.InvalidPathException;
import java.nio.file.Path;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
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


    @Transactional(readOnly = true)
    public VideoPage getMyVideos(Long ownerId, int page, int size) {
        var videos = videoRepository.findByOwnerIdOrderByIdDesc(
                ownerId,
                PageRequest.of(page, size)
        );

        var items = videos.map(video -> new VideoSummary(
                video.getId(),
                video.getTitle(),
                displayedAuthor(video),
                video.getDurationSeconds(),
                mediaUrl(video.getThumbnailPath())
        )).getContent();

        return new VideoPage(items, page, size, videos.hasNext());
    }
    @Transactional
    public VideoUploadResponse updateVideo(
            Long videoId,
            Long ownerId,
            VideoUpdateRequest request
    ) {
        var video = videoRepository.findById(videoId)
                .orElseThrow(VideoNotFoundException::new);

        //Comprobar session
        if (ownerId == null) {
            throw new AuthenticationRequiredException();
        }
        //Peticion sin cambios
        if (request == null
                || (request.title() == null && request.description() == null)) {
            throw new VideoUpdateException(
                    "Debes indicar un título o una descripción."
            );
        }

        // 1. Comprobar que video.getOwner().getId() coincide con ownerId.
        if (!video.getOwner().getId().equals(ownerId)) {
            throw new VideoAccessDeniedException(
                    "Solo puedes editar videos propios."
            );
        }
        // 2. Validar los campos recibidos.
        if (request.title()!=null && (request.title().isBlank() || request.title().length()>255)){
            throw new VideoUpdateException(
                    "El titulo debe tener entre 1 y 255 caracteres"
            );
        }
        if (request.description()!=null && request.description().isBlank()){
            throw new VideoUpdateException(
                    "La descripcion no puede estar vacia");

        }

        // 3. Actualizar solo los campos distintos de null.


        if (request.title() != null) {
            video.setTitle(request.title());
        }

        if (request.description() != null) {
            video.setDescription(request.description());
        }
        // 4. Devolver los datos actualizados mediante el mapper.

        return VideoMapper.toUploadResponse(video);
    }

    @Transactional
    public void deleteVideo(Long videoId, Long ownerId) {
        if (ownerId == null) {
            throw new AuthenticationRequiredException();
        }

        var video = videoRepository.findById(videoId)
                .orElseThrow(VideoNotFoundException::new);

        if (!video.getOwner().getId().equals(ownerId)) {
            throw new VideoAccessDeniedException(
                    "Solo puedes borrar tus propios vídeos."
            );
        }
        //rutas
        String videoPath = video.getVideoPath();
        String thumbnailPath = video.getThumbnailPath();

        // Pendiente: eliminar las relaciones del vídeo.
        commentRepository.deleteLikesByVideoId(videoId);
        commentRepository.deleteCommentsByVideoId(videoId);
        // Pendiente: eliminar el registro del vídeo.

        videoRepository.deleteTagLinksByVideoId(videoId);
        videoRepository.deleteViewsByVideoId(videoId);
        // Pendiente: programar la limpieza de archivos tras el commit.
        videoRepository.delete(video);
        videoRepository.flush();

        TransactionSynchronizationManager.registerSynchronization(
                new TransactionSynchronization() {
                    @Override
                    public void afterCommit() {
                        deleteStoredFile(videoPath);
                        deleteStoredFile(thumbnailPath);
                    }
                }
        );
    }
    private void deleteStoredFile(String relativePath) {
        try {
            Path storedPath = Path.of(relativePath);
            Path file = store.resolve(storedPath).normalize();

            if (storedPath.isAbsolute() || !file.startsWith(store)) {
                throw new IOException("Ruta fuera del almacén");
            }

            if (Files.notExists(file)) {
                return;
            }

            if (!file.toRealPath().startsWith(store.toRealPath())) {
                throw new IOException("El archivo apunta fuera del almacén");
            }

            Files.deleteIfExists(file);
        } catch (IOException | RuntimeException exception) {
            log.error(
                    "No se pudo eliminar el archivo {}. Limpieza pendiente.",
                    relativePath,
                    exception
            );
        }
    }
    private static final Logger log =
            LoggerFactory.getLogger(VideoService.class);




}

