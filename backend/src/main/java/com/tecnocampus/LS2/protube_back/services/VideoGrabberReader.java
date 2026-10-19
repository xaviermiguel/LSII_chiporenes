package com.tecnocampus.LS2.protube_back.services;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tecnocampus.LS2.protube_back.model.Comment;
import com.tecnocampus.LS2.protube_back.model.Video;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.math.RoundingMode;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.*;

@Component
public class VideoGrabberReader {
    public record SourceVideo(long sourceId, Video video, List<Comment> comments) {}
    private final ObjectMapper mapper;

    public VideoGrabberReader(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    public List<SourceVideo> read(Path directory, int pageSize, Long noCommentsId) throws IOException {
        if (pageSize < 1) throw new IllegalArgumentException("Page size must be positive");
        Path root = directory.toRealPath();
        List<SourceVideo> result = new ArrayList<>();
        try (var paths = Files.list(root)) {
            for (Path file : paths.filter(path -> path.getFileName().toString().endsWith(".json")).sorted().toList()) {
                try {
                    result.add(readVideo(root, file));
                } catch (RuntimeException | IOException exception) {
                    throw new IOException(file.getFileName() + ": " + exception.getMessage(), exception);
                }
            }
        }
        result.sort(Comparator.comparingLong(SourceVideo::sourceId));
        if (result.size() <= pageSize) {
            throw new IllegalArgumentException("Need more than " + pageSize + " videos to test additional loading");
        }
        SourceVideo empty = noCommentsId == null
                ? result.stream().filter(item -> item.comments().isEmpty()).findFirst().orElse(result.getFirst())
                : result.stream().filter(item -> item.sourceId() == noCommentsId).findFirst()
                        .orElseThrow(() -> new IllegalArgumentException("No-comments source ID does not exist"));
        empty.comments().clear();
        empty.video().getSourceMetadata().put("test_without_comments", true);
        if (result.stream().allMatch(item -> item.comments().isEmpty())) {
            throw new IllegalArgumentException("Need at least one video with source comments");
        }
        return result;
    }

    private SourceVideo readVideo(Path root, Path file) throws IOException {
        checkFile(root, file);
        JsonNode data = mapper.readTree(file.toFile());
        JsonNode idNode = data.path("id");
        if (!idNode.isIntegralNumber() || !idNode.canConvertToLong() || idNode.longValue() < 0) {
            throw new IllegalArgumentException("ID must be a non-negative integer");
        }
        long id = idNode.longValue();
        if (!file.getFileName().toString().equals(id + ".json")) {
            throw new IllegalArgumentException("Filename must match source ID");
        }
        checkFile(root, root.resolve(id + ".mp4"));
        checkFile(root, root.resolve(id + ".webp"));
        JsonNode meta = data.path("meta");
        if (!meta.isObject()) throw new IllegalArgumentException("meta must be an object");
        var video = new Video();
        video.setTitle(text(data, "title"));
        if (video.getTitle().codePointCount(0, video.getTitle().length()) > 255) {
            throw new IllegalArgumentException("Title exceeds SQL limit of 255 characters");
        }
        video.setDescription(text(meta, "description"));
        video.setExternalAuthor(text(data, "user"));
        video.setVideoPath(id + ".mp4");
        video.setThumbnailPath(id + ".webp");
        video.setWidth(positiveInt(data, "width"));
        video.setHeight(positiveInt(data, "height"));
        JsonNode duration = data.path("duration");
        if (!duration.isNumber() || duration.decimalValue().signum() <= 0) {
            throw new IllegalArgumentException("Duration must be positive");
        }
        var seconds = duration.decimalValue().setScale(2, RoundingMode.UNNECESSARY);
        if (seconds.precision() > 12) throw new IllegalArgumentException("Duration exceeds numeric(12,2)");
        video.setDurationSeconds(seconds);
        video.setPublishedAt(timestamp(data));
        Map<String, Object> metadata = mapper.convertValue(meta, new TypeReference<>() {});
        metadata.remove("comments");
        metadata.put("video_grabber_id", id);
        metadata.put("source", "videoGrabber");
        video.setSourceMetadata(metadata);

        JsonNode sourceComments = meta.path("comments");
        if (!sourceComments.isMissingNode() && !sourceComments.isArray()) {
            throw new IllegalArgumentException("meta.comments must be an array");
        }
        List<Comment> comments = new ArrayList<>();
        for (JsonNode source : sourceComments) {
            var comment = new Comment();
            comment.setText(text(source, "text"));
            comment.setExternalAuthor(text(source, "author"));
            comment.setCreatedAt(timestamp(source));
            Map<String, Object> commentMetadata = new LinkedHashMap<>();
            if (source.has("like_count")) commentMetadata.put("like_count", mapper.convertValue(source.get("like_count"), Object.class));
            commentMetadata.put("source", "videoGrabber");
            comment.setSourceMetadata(commentMetadata);
            comments.add(comment);
        }
        return new SourceVideo(id, video, comments);
    }

    private void checkFile(Path root, Path file) throws IOException {
        if (!Files.isRegularFile(file) || Files.size(file) == 0 || !file.toRealPath().getParent().equals(root)) {
            throw new IOException("Missing, empty, or external file: " + file.getFileName());
        }
    }

    private String text(JsonNode data, String field) {
        JsonNode value = data.path(field);
        if (!value.isTextual() || value.textValue().isBlank()) throw new IllegalArgumentException(field + " must be non-empty text");
        return value.textValue();
    }

    private int positiveInt(JsonNode data, String field) {
        JsonNode value = data.path(field);
        if (!value.isIntegralNumber() || !value.canConvertToInt() || value.intValue() <= 0) {
            throw new IllegalArgumentException(field + " must be a positive integer");
        }
        return value.intValue();
    }

    private Instant timestamp(JsonNode data) {
        JsonNode value = data.path("timestamp");
        if (!value.isIntegralNumber() || !value.canConvertToLong()) throw new IllegalArgumentException("timestamp must be epoch seconds");
        return Instant.ofEpochSecond(value.longValue());
    }
}
