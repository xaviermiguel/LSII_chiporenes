package com.tecnocampus.LS2.protube_back.services;

import com.tecnocampus.LS2.protube_back.model.User;
import com.tecnocampus.LS2.protube_back.model.Video;
import com.tecnocampus.LS2.protube_back.repository.UserRepository;
import com.tecnocampus.LS2.protube_back.repository.VideoRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Path;

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


        // TODO: Guardar los archivos con nombres únicos.

        // TODO: Guardar el vídeo asociado al propietario.

        // TODO: Limpiar los archivos si falla el guardado.



        throw new UnsupportedOperationException(
                "Not supported yet.");
    }








}
