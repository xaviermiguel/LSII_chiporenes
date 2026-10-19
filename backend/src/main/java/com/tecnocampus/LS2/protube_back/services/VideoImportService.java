package com.tecnocampus.LS2.protube_back.services;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tecnocampus.LS2.protube_back.model.Comment;
import com.tecnocampus.LS2.protube_back.repository.CommentRepository;
import com.tecnocampus.LS2.protube_back.repository.VideoRepository;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.List;
import java.util.Set;

@Service
public class VideoImportService {
    public record Result(int addedVideos, int addedComments, int unchangedVideos, long noCommentsSourceId) {}
    private final VideoGrabberReader reader;
    private final VideoRepository videos;
    private final CommentRepository comments;
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;

    public VideoImportService(VideoGrabberReader reader, VideoRepository videos, CommentRepository comments,
                              JdbcTemplate jdbc, ObjectMapper mapper) {
        this.reader = reader;
        this.videos = videos;
        this.comments = comments;
        this.jdbc = jdbc;
        this.mapper = mapper;
    }

    public boolean usesPostgres() {
        return Boolean.TRUE.equals(jdbc.execute((ConnectionCallback<Boolean>) connection ->
                connection.getMetaData().getDatabaseProductName().equals("PostgreSQL")));
    }

    @Transactional(rollbackFor = Exception.class)
    public Result importDirectory(Path directory, int pageSize, Long noCommentsId) throws IOException {
        // Parse/validate the complete input before the first database write.
        var sources = reader.read(directory, pageSize, noCommentsId);
        jdbc.execute((ConnectionCallback<Void>) connection -> {
            if (connection.getMetaData().getDatabaseProductName().equals("PostgreSQL")) {
                // Same transaction/connection as JPA; serializes cooperating importers until commit.
                try (var statement = connection.createStatement()) {
                    statement.execute("select pg_advisory_xact_lock(7361829401)");
                }
            }
            return null;
        });
        int addedVideos = 0;
        int addedComments = 0;
        int unchanged = 0;
        long emptyId = -1;
        for (var source : sources) {
            var existing = videos.findByVideoPath(source.video().getVideoPath());
            var video = existing.orElse(source.video());
            if (existing.isEmpty()) {
                video = videos.saveAndFlush(video);
                addedVideos++;
            } else {
                // A reused filename must not attach source comments to unrelated uploaded content.
                Object origin = video.getSourceMetadata().get("video_grabber_id");
                if (!(origin instanceof Number number) || number.longValue() != source.sourceId()) {
                    throw new IllegalStateException("Existing video path has no matching videoGrabber origin: " + video.getVideoPath());
                }
                unchanged++;
            }
            var stored = comments.findByVideoIdOrderByCreatedAtAscIdAsc(video.getId());
            if (Boolean.TRUE.equals(source.video().getSourceMetadata().get("test_without_comments"))) {
                if (!stored.isEmpty()) throw new IllegalStateException("Selected no-comments video already has comments; choose another source ID");
                emptyId = source.sourceId();
            }
            Set<String> keys = new HashSet<>();
            for (Comment comment : stored) {
                Object key = comment.getSourceMetadata().get("video_grabber_key");
                if (key instanceof String value) keys.add(value);
                // Also recognize older manually imported external comments without an origin key.
                if (comment.getExternalAuthor() != null) keys.add(identity(comment));
            }
            for (Comment comment : source.comments()) {
                String key = identity(comment);
                if (keys.add(key)) {
                    comment.setVideo(video);
                    comment.getSourceMetadata().put("video_grabber_key", key);
                    comments.save(comment);
                    addedComments++;
                }
            }
        }
        comments.flush();
        return new Result(addedVideos, addedComments, unchanged, emptyId);
    }

    private String identity(Comment comment) throws JsonProcessingException {
        byte[] tuple = mapper.writeValueAsBytes(List.of(comment.getText(), comment.getExternalAuthor(), comment.getCreatedAt().toString()));
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(tuple));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("Java runtime lacks SHA-256", exception);
        }
    }
}
