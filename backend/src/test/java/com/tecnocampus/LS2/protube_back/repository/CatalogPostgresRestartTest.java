package com.tecnocampus.LS2.protube_back.repository;

import com.tecnocampus.LS2.protube_back.ProtubeBackApplication;
import com.tecnocampus.LS2.protube_back.services.VideoService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/** Commits only its own fixtures, closes Spring completely, then opens a new context. */
@EnabledIfEnvironmentVariable(named = "RUN_CATALOG_POSTGRES_TESTS", matches = "true")
class CatalogPostgresRestartTest {
    private ConfigurableApplicationContext start() {
        return new SpringApplicationBuilder(ProtubeBackApplication.class).run(
                "--spring.profiles.active=prod",
                "--server.port=0",
                "--pro_tube.store.dir=" + System.getProperty("java.io.tmpdir"),
                "--pro_tube.load_initial_data=false",
                "--spring.jpa.hibernate.ddl-auto=validate",
                "--spring.flyway.enabled=true",
                "--spring.flyway.baseline-on-migrate=false",
                "--spring.flyway.clean-disabled=true");
    }

    @Test
    void committedVideoAndCommentSurviveApplicationRestart() {
        String path = "restart-test-" + UUID.randomUUID() + ".mp4";
        Long videoId;
        Long commentId;
        try (var first = start()) {
            var transaction = new TransactionTemplate(first.getBean(PlatformTransactionManager.class));
            var ids = transaction.execute(status -> {
                var video = first.getBean(VideoRepository.class).saveAndFlush(CatalogRepositoryTest.video(path));
                var comment = first.getBean(CommentRepository.class).saveAndFlush(
                        CatalogRepositoryTest.comment(video, "Committed before restart"));
                return new Long[]{video.getId(), comment.getId()};
            });
            assertNotNull(ids);
            videoId = ids[0];
            commentId = ids[1];
        }
        // A new connection pool and EntityManagerFactory must read committed PostgreSQL data.
        try (var second = start()) {
            var videos = second.getBean(VideoRepository.class);
            var comments = second.getBean(CommentRepository.class);
            var transaction = new TransactionTemplate(second.getBean(PlatformTransactionManager.class));
            try {
                transaction.executeWithoutResult(status -> {
                    var video = videos.findById(videoId).orElseThrow();
                    var comment = comments.findById(commentId).orElseThrow();
                    assertEquals(path, video.getVideoPath());
                    assertEquals(videoId, comment.getVideo().getId());
                    assertEquals("Committed before restart", comment.getText());
                    assertEquals(3, comment.getSourceMetadata().get("like_count"));
                    assertTrue(second.getBean(VideoService.class)
                            .getVideos()
                            .stream()
                            .anyMatch(item ->
                                    videoId.equals(item.id())
                                            && video.getTitle().equals(item.title())
                            ));
                });
            } finally {
                // Only records inserted by this test; never truncate, drop, or delete another user's data.
                transaction.executeWithoutResult(status -> {
                    comments.deleteById(commentId);
                    comments.flush();
                    videos.deleteById(videoId);
                });
            }
        }
    }
}
