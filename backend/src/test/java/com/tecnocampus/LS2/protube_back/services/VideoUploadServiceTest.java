package com.tecnocampus.LS2.protube_back.services;

import com.tecnocampus.LS2.protube_back.model.User;
import com.tecnocampus.LS2.protube_back.repository.UserRepository;
import com.tecnocampus.LS2.protube_back.repository.VideoRepository;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.stereotype.Service;
import org.testng.annotations.Test;

import java.nio.file.Path;


public class VideoUploadServiceTest {
    // Subir un video valido


    @TempDir
    Path store;

    @Test

    public void uploadsValidVideo() {
        // Preparar : Crear el usuario, los archivos temporales,
        // el título y la descripción

        User owner = new User();
        owner.setId(1L);
        owner.setDisplayName("Usario de prueba");

        String title = "Mi primer video";
        String description= "Descripcion de preuba";

        MockMultipartFile video = new MockMultipartFile(
                "video",
                "example.mp4",
                "video/mp4",
                new byte [] {1,2,3}
        );
        MockMultipartFile thumbnail = new MockMultipartFile(
                "thumbnail",
                "example.webp",
                "image/webp",
                new byte [] {4,5,6}
        );
        //Actuar: llamar al servicio de subida.
        //Comprobar: verificar el propietario, los archivos y los datos guardados.

    }


}
