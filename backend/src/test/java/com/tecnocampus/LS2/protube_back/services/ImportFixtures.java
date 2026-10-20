package com.tecnocampus.LS2.protube_back.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

public final class ImportFixtures {
    public static final ObjectMapper MAPPER = new ObjectMapper();

    private ImportFixtures() {}

    public static ObjectNode data(int id) throws IOException {
        ObjectNode result = (ObjectNode) MAPPER.readTree("""
                {"id":0,"title":"Vídeo de prueba","user":"Canal externo","timestamp":1408396680,
                 "width":1920,"height":1080,"duration":72.25,
                 "meta":{"description":"Descripción","tags":["music"],"view_count":42,
                         "comments":[{"text":"Comentario","author":"Autor","timestamp":1791356400,"like_count":1}]}}
                """);
        return result.put("id", id);
    }

    public static void write(Path store, int id, ObjectNode data) throws IOException {
        MAPPER.writeValue(store.resolve(id + ".json").toFile(), data);
    }

    public static void store(Path directory, int count) throws IOException {
        for (int id = 0; id < count; id++) {
            write(directory, id, data(id));
            Files.write(directory.resolve(id + ".mp4"), new byte[]{1, 2, 3});
            Files.write(directory.resolve(id + ".webp"), new byte[]{4, 5, 6});
        }
    }
}
