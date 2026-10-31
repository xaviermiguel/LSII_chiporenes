package com.tecnocampus.LS2.protube_back.services;

import com.tecnocampus.LS2.protube_back.model.User;
import com.tecnocampus.LS2.protube_back.model.Video;
import com.tecnocampus.LS2.protube_back.repository.UserRepository;
import com.tecnocampus.LS2.protube_back.repository.VideoRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

@Service
public class VideoUploadService {
    private final VideoRepository videoRepository;
    private final UserRepository userRepository;
    private final Path store; // Que hacia filepath ??

    public VideoUploadService(VideoRepository videoRepository, UserRepository userRepository, @Value("${pro_tube.store.dir}") String storeDirectory ) {
        this.videoRepository = videoRepository;
        this.userRepository = userRepository;

        this.store = Path.of(storeDirectory).toAbsolutePath().normalize();
    }

    public Video uploadVideo (
            Long ownerId,
            String title,
            String description,
            MultipartFile video,
            MultipartFile thumbnail ) {

        // TODO: Comprobar que el propietario existe.
        User owner = userRepository.findById(ownerId)
                .orElseThrow(() ->
                        new IllegalArgumentException("El usuario no existe"));


        // TODO: Validar los datos y los archivos.
        if (!owner.isEnabled()){
            throw new IllegalArgumentException("Usuario no activado");
        }
        if (title == null || title.isBlank() ){
            throw new IllegalArgumentException("Titulo no valido");
        }
        if(description == null || description.isBlank() ){
            throw new IllegalArgumentException("Descripcion no valido");

        }
        if (video ==null || video.isEmpty()){
            throw new IllegalArgumentException("Video no valido");
        }
        if (thumbnail ==null || thumbnail.isEmpty()){
            throw new IllegalArgumentException("Miniatura no valido");
        }

        // TODO: Guardar los archivos con nombres únicos.

        String uploadId = UUID.randomUUID().toString();

        String videoFileName = uploadId + ".mp4";
        String thumbnailFileName = uploadId + ".jpg";

        Path videoDestination = store.resolve(videoFileName);
        Path thumbDestination = store.resolve(thumbnailFileName);

        // TODO: Guardar el vídeo asociado al propietario.
        Video uploadVideo = new Video();

        uploadVideo.setOwner(owner);
        uploadVideo.setTitle(title);
        uploadVideo.setDescription(description);
        uploadVideo.setVideoPath(videoFileName);
        uploadVideo.setThumbnailPath(thumbnailFileName);

        //return videoRepository.save(uploadVideo);
        // TODO: Limpiar los archivos si falla el guardado.

        try {
            Files.createDirectories(store);

            video.transferTo(videoDestination);
            thumbnail.transferTo(thumbDestination);

            return videoRepository.saveAndFlush(uploadVideo);
        }catch (RuntimeException | IOException e){
            try{
                Files.deleteIfExists(videoDestination);
            } catch (IOException ioe){
                e.addSuppressed(ioe);
            }
            try{
                Files.deleteIfExists(thumbDestination);
            }catch (IOException ioe){
                e.addSuppressed(ioe);
            }
            throw new IllegalArgumentException("No se ha podido completar la subida del vídeo", e);

        }

    }








}
