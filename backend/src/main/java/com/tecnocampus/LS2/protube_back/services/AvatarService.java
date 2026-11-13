package com.tecnocampus.LS2.protube_back.services;

import com.tecnocampus.LS2.protube_back.model.User;
import com.tecnocampus.LS2.protube_back.repository.UserRepository;
import com.tecnocampus.LS2.protube_back.services.exceptions.AuthenticationRequiredException;
import org.springframework.beans.factory.annotation.Value;
import org.h2.security.auth.AuthenticationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import javax.imageio.ImageIO;
import javax.imageio.stream.MemoryCacheImageInputStream;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

@Service
public class AvatarService {
    private static final long MAX_FILE_BYTES = 2L * 1024*1024;
    private static final int MAX_INPUT_DIMENSION = 4096;
    private static final int MAX_AVATAR_DIMENSION = 256;
    private final UserRepository users;
    private final TransactionTemplate transactions;
    private final Path avatarsDirectory;

    public AvatarService(UserRepository users,
                         TransactionTemplate transactions,
                         @Value("${pro_tube.store.dir}") String storeDirectory) {
        this.users = users;
        this.transactions=transactions;
        this.avatarsDirectory = Path.of(storeDirectory)
                .toAbsolutePath().normalize().resolve("avatars");


    }

    public void updateAvatar(Long id, MultipartFile avatar) {
        if (id== null){
            throw new AuthenticationRequiredException();
        }
        BufferedImage image = resize (readAvatar(avatar));
        String filename = UUID.randomUUID() + ".png";
        Path destination = avatarsDirectory.resolve(filename);

        try {
            Files.createDirectories(avatarsDirectory);
            if (!ImageIO.write(image,"png",destination.toFile())){
                throw new IOException("No se pudo modificar el avatar como PNG.");
            }
    } catch (IOException exception) {
            deleteNewFile(destination,exception);
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "No se pudo guardar el avatar.",
                    exception
            );
        }
        try {
            transactions.executeWithoutResult(status ->{
                User user = users.findById(id)
                        .filter (User::isEnabled)
                        .orElseThrow(AuthenticationRequiredException::new);
                user.setAvatarPath("avatars/"+filename);

            });
        }catch (RuntimeException exception){
            deleteNewFile(destination,exception);
            throw exception;
        }

        }
    private static BufferedImage readAvatar(MultipartFile avatar) {
        if (avatar == null || avatar.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Selecciona un archivo de imagen."
            );
        }
        if (avatar.getSize() > MAX_FILE_BYTES) {
            throw new ResponseStatusException(
                    HttpStatus.PAYLOAD_TOO_LARGE, "El avatar supera los 2 MiB."
            );
        }

        try (var input = avatar.getInputStream();
             var imageInput = new MemoryCacheImageInputStream(input)) {
            var readers = ImageIO.getImageReaders(imageInput);
            if (!readers.hasNext()) {
                throw invalidImage();
            }

            var reader = readers.next();
            try {
                String format = reader.getFormatName();
                if (!format.equalsIgnoreCase("JPEG") && !format.equalsIgnoreCase("PNG")) {
                    throw invalidImage();
                }

                imageInput.seek(0);
                reader.setInput(imageInput, true, true);

                int width = reader.getWidth(0);
                int height = reader.getHeight(0);
                if (width < 1 || height < 1
                        || width > MAX_INPUT_DIMENSION || height > MAX_INPUT_DIMENSION) {
                    throw new ResponseStatusException(
                            HttpStatus.BAD_REQUEST,
                            "La imagen debe tener como máximo 4096 × 4096 píxeles."
                    );
                }

                return reader.read(0);
            } finally {
                reader.dispose();
            }
        } catch (IOException exception) {
            throw invalidImage();
        }
    }
    private static BufferedImage resize(BufferedImage source) {
        int width = source.getWidth();
        int height = source.getHeight();
        double scale = Math.min(
                1.0, (double) MAX_AVATAR_DIMENSION / Math.max(width, height)
        );

        int targetWidth = Math.max(1, (int) Math.round(width * scale));
        int targetHeight = Math.max(1, (int) Math.round(height * scale));
        var result = new BufferedImage(targetWidth, targetHeight, BufferedImage.TYPE_INT_ARGB);

        Graphics2D graphics = result.createGraphics();
        try {
            graphics.setRenderingHint(
                    RenderingHints.KEY_INTERPOLATION,
                    RenderingHints.VALUE_INTERPOLATION_BILINEAR
            );
            graphics.drawImage(source, 0, 0, targetWidth, targetHeight, null);
        } finally {
            graphics.dispose();
        }
        return result;
    }


    private static ResponseStatusException invalidImage() {
        return new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "El avatar debe ser una imagen JPEG o PNG válida."
        );
    }
    private static void deleteNewFile(Path file, Throwable failure) {
        try {
            Files.deleteIfExists(file);
        } catch (IOException cleanupFailure) {
            failure.addSuppressed(cleanupFailure);
        }
    }
    }


