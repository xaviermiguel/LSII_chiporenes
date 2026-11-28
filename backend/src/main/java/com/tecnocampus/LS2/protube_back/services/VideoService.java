package com.tecnocampus.LS2.protube_back.services;

import com.tecnocampus.LS2.protube_back.dto.video.*;
import com.tecnocampus.LS2.protube_back.mapper.VideoMapper;
import com.tecnocampus.LS2.protube_back.model.Video;
import com.tecnocampus.LS2.protube_back.model.Category;
import java.util.LinkedHashMap;
import com.tecnocampus.LS2.protube_back.repository.CategoryRepository;
import com.tecnocampus.LS2.protube_back.repository.CommentRepository;
import com.tecnocampus.LS2.protube_back.storage.LocalVideoStore;
import com.tecnocampus.LS2.protube_back.services.exceptions.*;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.tecnocampus.LS2.protube_back.repository.VideoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.util.UriUtils;

import java.util.List;
import java.util.Map;

@Service
public class VideoService {
    private final CategoryRepository categories;
    private final VideoRepository videoRepository;
    private final CommentRepository commentRepository;
    private final LocalVideoStore store;

    public VideoService(VideoRepository videoRepository, CommentRepository commentRepository,
                       CategoryRepository categories, LocalVideoStore store) {
        this.videoRepository = videoRepository;
        this.commentRepository = commentRepository;
        this.categories = categories;
        this.store = store;
    }

    @Transactional(readOnly = true)
    public VideoPage getVideos(int page, int size) {
        var videos = videoRepository.findAllByOrderByIdAsc(PageRequest.of(page, size));
        var items = videos.map(video -> new VideoSummary(video.getId(), video.getTitle(),
                displayedAuthor(video),
                video.getDurationSeconds(), mediaUrl(video.getThumbnailPath()))).getContent();
        return new VideoPage(items, page, size, videos.hasNext());
    }

    @Transactional(readOnly = true)
    public VideoPage searchVideos(String query, int page, int size) {
        String phrase = query.strip().toLowerCase(java.util.Locale.ROOT);
        if (phrase.isEmpty()) {
            return new VideoPage(List.of(), page, size, false);
        }
        String pattern = "%" + phrase.replace("!", "!!").replace("%", "!%")
                .replace("_", "!_") + "%";
        var videos = videoRepository.search(pattern, PageRequest.of(page, size));
        var items = videos.map(video -> new VideoSummary(video.getId(), video.getTitle(),
                displayedAuthor(video), video.getDurationSeconds(),
                mediaUrl(video.getThumbnailPath()))).getContent();
        return new VideoPage(items, page, size, videos.hasNext());
    }

    static String mediaUrl(String relativePath) {
        // Encode the stored filename as a URL path, never derive it from the database ID.
        return UriUtils.encodePath("/media/" + relativePath.replace('\\', '/'), StandardCharsets.UTF_8);
    }
    @Transactional(readOnly = true)
    public VideoDetailResponse getVideoById(Long id) {
        var video = videoRepository.findById(id).orElseThrow(VideoNotFoundException::new);
        if (!store.isReadable(video.getVideoPath())) {
            throw new VideoNotFoundException("El archivo del vídeo no está disponible.");
        }
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
                .map(VideoMapper::toCommentResponse)
                .toList();

        var externalAuthor = displayedExternalAuthor(video);
        var owner = video.getOwner();
        Map<String, Object> source = externalAuthor == null ? Map.of() : video.getSourceMetadata();
        var channel = source.get("channel") instanceof String name && !name.isBlank() ? name.strip() : null;
        return new VideoDetailResponse(
                video.getId(),
                video.getTitle(),
                externalAuthor == null ? owner.getDisplayName() : externalAuthor,
                video.getDurationSeconds(),
                mediaUrl(video.getThumbnailPath()),
                video.getDescription(),
                mediaUrl(video.getVideoPath()),
                tags,
                comments,
                owner.getId(),
                externalAuthor == null ? owner.getId() : null,
                importedCount(source.get("view_count")),
                importedCount(source.get("like_count")),
                channel,
                importedCount(source.get("channel_follower_count")),
                video.getCategory() == null ? null : new CategoryResponse(
                        video.getCategory().getId(), video.getCategory().getName())
        );
    }
    private Long importedCount(Object value) {
        if (!(value instanceof Number number)) return null;
        try {
            long count = new BigDecimal(number.toString()).longValueExact();
            return count >= 0 ? count : null;
        } catch (IllegalArgumentException | ArithmeticException exception) {
            return null;
        }
    }

    private String displayedAuthor(Video video) {
        var externalAuthor = displayedExternalAuthor(video);
        return externalAuthor == null ? video.getOwner().getDisplayName() : externalAuthor;
    }

    private String displayedExternalAuthor(Video video) {
        var owner = video.getOwner();
        var externalAuthor = video.getExternalAuthor();
        if ("demo@protube.invalid".equalsIgnoreCase(owner.getEmail())
                && externalAuthor != null && !externalAuthor.isBlank()) {
            return externalAuthor;
        }
        return null;
    }

    @Transactional(readOnly = true)
    public VideoPage getMyVideos(Long ownerId, int page, int size) {
        if (ownerId == null) throw new AuthenticationRequiredException();
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
    @Transactional(readOnly = true)
    public VideoUploadResponse getOwnVideoForEdit(Long videoId, Long ownerId) {
        if (ownerId == null) throw new AuthenticationRequiredException();
        var video = videoRepository.findById(videoId).orElseThrow(VideoNotFoundException::new);
        if (!video.getOwner().getId().equals(ownerId)) {
            throw new VideoAccessDeniedException("Solo puedes editar vídeos propios.");
        }
        return VideoMapper.toUploadResponse(video);
    }

    @Transactional
    public VideoDetailResponse updateVideo(
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
        if (!video.getOwner().getId().equals(ownerId)) {
            throw new VideoAccessDeniedException("Solo puedes editar videos propios.");
        }
        // Missing fields retain their values; explicit categoryId:null clears it.
        if (request == null
                || (request.title() == null && request.description() == null
                    && request.tags() == null && !request.categorySupplied())) {
            throw new VideoUpdateException(
                    "Debes indicar al menos un campo editable."
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

        Category category = video.getCategory();
        if (request.categorySupplied()) {
            category = request.categoryId() == null ? null : categories.findById(request.categoryId()).orElse(null);
            if (request.categoryId() != null && category == null) {
                throw new VideoUpdateException("La categoría seleccionada no existe.");
            }
        }
        if (request.tags() != null && request.tags().stream().anyMatch(java.util.Objects::isNull)) {
            throw new VideoUpdateException("Las etiquetas deben ser textos, sin valores nulos.");
        }

        // 3. Actualizar solo los campos distintos de null.


        if (request.title() != null) {
            video.setTitle(request.title());
        }

        if (request.description() != null) {
            video.setDescription(request.description());
        }
        if (request.tags() != null) {
            var metadata = new LinkedHashMap<>(video.getSourceMetadata());
            metadata.put("tags", request.tags().stream().map(String::trim)
                    .filter(tag -> !tag.isEmpty()).distinct().toList());
            video.setSourceMetadata(metadata);
        }
        if (request.categorySupplied()) video.setCategory(category);
        // Return the authoritative detail, including normalized tags and category.

        return getVideoById(videoId);
    }

    @Transactional(readOnly = true)
    public List<CategoryResponse> getCategories() {
        return categories.findAllByOrderByNameAscIdAsc().stream().map(c -> new CategoryResponse(c.getId(), c.getName())).toList();
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
        // Prevent a like from being inserted between deleting the likes and their comments.
        commentRepository.lockMainCommentsForVideoDeletion(videoId);
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
                        store.delete(videoPath);
                        store.delete(thumbnailPath);
                    }
                }
        );
    }
}
