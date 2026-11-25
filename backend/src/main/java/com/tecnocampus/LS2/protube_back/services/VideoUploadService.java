package com.tecnocampus.LS2.protube_back.services;

import com.tecnocampus.LS2.protube_back.dto.video.VideoUploadResponse;
import com.tecnocampus.LS2.protube_back.mapper.VideoMapper;
import com.tecnocampus.LS2.protube_back.storage.LocalVideoStore;
import com.tecnocampus.LS2.protube_back.model.User;
import com.tecnocampus.LS2.protube_back.model.Video;
import com.tecnocampus.LS2.protube_back.repository.UserRepository;
import com.tecnocampus.LS2.protube_back.repository.VideoRepository;
import com.tecnocampus.LS2.protube_back.services.exceptions.VideoUploadException;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Objects;

@Service
public class VideoUploadService {
    private final VideoRepository videoRepository;
    private final UserRepository userRepository;
    private final LocalVideoStore store;

    public VideoUploadService(VideoRepository videoRepository, UserRepository userRepository, LocalVideoStore store) {
        this.videoRepository = videoRepository;
        this.userRepository = userRepository;

        this.store = store;
    }

    public VideoUploadResponse uploadVideo(
            Long ownerId,
            String title,
            String description,
            List<String> tags,
            MultipartFile video,
            MultipartFile thumbnail ) {

        User owner = userRepository.findById(ownerId)
                .orElseThrow(() ->
                        new IllegalArgumentException("El usuario no existe"));


        if (!owner.isEnabled()){
            throw new IllegalArgumentException("Usuario no activado");
        }
        if (title == null || title.isBlank() ){
            throw new VideoUploadException("Titulo no valido");
        }
        if(description == null || description.isBlank() ){
            throw new VideoUploadException("Descripcion no valido");

        }
        if (video ==null || video.isEmpty()){
            throw new VideoUploadException("Video no valido");
        }
        if (thumbnail ==null || thumbnail.isEmpty()){
            throw new VideoUploadException("Miniatura no valido");
        }

        var paths = store.newUploadPaths();
        Video uploadVideo = new Video();

        uploadVideo.setOwner(owner);
        uploadVideo.setTitle(title);
        uploadVideo.setDescription(description);
        uploadVideo.getSourceMetadata().put("tags", tags == null ? List.of()
                : tags.stream().filter(Objects::nonNull).map(String::trim)
                .filter(tag -> !tag.isEmpty()).distinct().toList());
        uploadVideo.setVideoPath(paths.video());
        uploadVideo.setThumbnailPath(paths.thumbnail());

        Video saved;
        try {
            store.writeUpload(paths, video, thumbnail);
            saved = videoRepository.saveAndFlush(uploadVideo);
        } catch (RuntimeException | IOException failure) {
            store.discardUpload(paths, failure);
            throw new IllegalArgumentException("No se ha podido completar la subida del vídeo", failure);
        }
        return VideoMapper.toUploadResponse(saved);
    }
}
