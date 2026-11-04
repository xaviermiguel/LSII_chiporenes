package com.tecnocampus.LS2.protube_back.services;

import com.tecnocampus.LS2.protube_back.dto.video.*;
import com.tecnocampus.LS2.protube_back.model.Video;
import com.tecnocampus.LS2.protube_back.model.Category;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.util.LinkedHashMap;
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
    @PersistenceContext
    private EntityManager entityManager;
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
        long offset = PageRequest.of(page, size).getOffset();
        var available = videoRepository.findAllByOrderByIdAsc().stream()
                .filter(video -> isStoredFileAvailable(video.getVideoPath())
                        && isStoredFileAvailable(video.getThumbnailPath()))
                .skip(offset)
                .limit(size + 1L)
                .toList();
        var items = available.stream().limit(size)
                .map(video -> new VideoSummary(video.getId(), video.getTitle(), displayedAuthor(video),
                        video.getDurationSeconds(), mediaUrl(video.getThumbnailPath())))
                .toList();
        return new VideoPage(items, page, size, available.size() > size);
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
                comments,
                video.getOwner().getId(),
                video.getCategory() == null ? null : new CategoryResponse(
                        video.getCategory().getId(), video.getCategory().getName())
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
        if (!isStoredFileAvailable(relativePath)) {
            throw new VideoNotFoundException("El archivo del vídeo no está disponible.");
        }
    }

    private boolean isStoredFileAvailable(String relativePath) {
        if (relativePath == null || relativePath.isBlank()) {
            return false;
        }
        try {
            Path storedPath = Path.of(relativePath);
            Path file = store.resolve(storedPath).normalize();
            return !storedPath.isAbsolute() && file.startsWith(store) && Files.isRegularFile(file)
                    && Files.isReadable(file) && file.toRealPath().startsWith(store.toRealPath())
                    && Files.size(file) > 0;
        } catch (IOException | InvalidPathException exception) {
            return false;
        }
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
            category = request.categoryId() == null ? null : entityManager.find(Category.class, request.categoryId());
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
        return entityManager.createQuery("select c from Category c order by c.name, c.id", Category.class)
                .getResultStream().map(c -> new CategoryResponse(c.getId(), c.getName())).toList();
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

