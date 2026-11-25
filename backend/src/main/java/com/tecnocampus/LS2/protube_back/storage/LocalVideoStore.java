package com.tecnocampus.LS2.protube_back.storage;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.InvalidPathException;
import java.nio.file.Path;
import java.util.UUID;

@Component
public class LocalVideoStore {
    private static final Logger log = LoggerFactory.getLogger(LocalVideoStore.class);
    private final Path store;

    public LocalVideoStore(@Value("${pro_tube.store.dir}") String directory) {
        this.store = Path.of(directory).toAbsolutePath().normalize();
    }

    public record UploadPaths(String video, String thumbnail) {}

    public UploadPaths newUploadPaths() {
        String id = UUID.randomUUID().toString();
        return new UploadPaths(id + ".mp4", id + ".webp");
    }

    public void writeUpload(UploadPaths paths, MultipartFile video, MultipartFile thumbnail) throws IOException {
        Files.createDirectories(store);
        video.transferTo(store.resolve(paths.video()));
        thumbnail.transferTo(store.resolve(paths.thumbnail()));
    }

    public void discardUpload(UploadPaths paths, Throwable failure) {
        discardNewFile(paths.video(), failure);
        discardNewFile(paths.thumbnail(), failure);
    }

    private void discardNewFile(String relativePath, Throwable failure) {
        try {
            Files.deleteIfExists(store.resolve(relativePath));
        } catch (IOException cleanupFailure) {
            failure.addSuppressed(cleanupFailure);
        }
    }

    public boolean isReadable(String relativePath) {
        try {
            Path storedPath = Path.of(relativePath);
            Path file = store.resolve(storedPath).normalize();
            if (!storedPath.isAbsolute() && file.startsWith(store) && Files.isRegularFile(file)
                    && Files.isReadable(file) && file.toRealPath().startsWith(store.toRealPath())) {
                return true;
            }
        } catch (IOException | InvalidPathException exception) {
            // A missing, invalid or inaccessible resource is unavailable to the player.
        }
        return false;
    }

    public void delete(String relativePath) {
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
}
