package com.tecnocampus.LS2.protube_back.repository;

import com.tecnocampus.LS2.protube_back.ProtubeBackApplication;
import com.tecnocampus.LS2.protube_back.dto.video.CommentLikesResponse;
import com.tecnocampus.LS2.protube_back.model.User;
import com.tecnocampus.LS2.protube_back.services.CommentService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import com.tecnocampus.LS2.protube_back.services.VideoService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.UUID;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

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
                "--pro_tube.import.enabled=false",
                "--spring.jpa.hibernate.ddl-auto=validate",
                "--spring.flyway.enabled=true",
                "--spring.flyway.baseline-on-migrate=false",
                "--spring.flyway.clean-disabled=true");
    }

    @Test
    void committedUserOwnershipVideoCommentReplyAndLikeSurviveApplicationRestart() throws Exception {
        String path = "restart-test-" + UUID.randomUUID() + ".mp4";
        String email = "restart-" + UUID.randomUUID() + "@example.com";
        String hash = new BCryptPasswordEncoder(12).encode("Restart-test-password");
        Long videoId;
        Long commentId;
        Long ownerId;
        Long replyId;
        try (var first = start()) {
            var transaction = new TransactionTemplate(first.getBean(PlatformTransactionManager.class));
            var ids = transaction.execute(status -> {
                var owner = new User();
                owner.setEmail(email);
                owner.setDisplayName("Restart test owner");
                owner.setPasswordHash(hash);
                first.getBean(UserRepository.class).saveAndFlush(owner);
                var video = first.getBean(VideoRepository.class).saveAndFlush(CatalogRepositoryTest.video(path, owner));
                var comment = first.getBean(CommentRepository.class).saveAndFlush(
                        CatalogRepositoryTest.comment(video, "Committed before restart"));
                return new Long[]{video.getId(), comment.getId(), owner.getId()};
            });
            assertNotNull(ids);
            videoId = ids[0];
            commentId = ids[1];
            ownerId = ids[2];
            replyId = first.getBean(CommentService.class)
                    .publishReply(videoId, commentId, ownerId, "Reply committed before restart").id();

            var reactions = first.getBean(CommentService.class);
            var startTogether = new CyclicBarrier(2);
            try (var executor = Executors.newFixedThreadPool(2)) {
                var firstRequest = executor.submit(() -> {
                    startTogether.await(10, TimeUnit.SECONDS);
                    return reactions.setLike(videoId, commentId, ownerId, true);
                });
                var secondRequest = executor.submit(() -> {
                    startTogether.await(10, TimeUnit.SECONDS);
                    return reactions.setLike(videoId, commentId, ownerId, true);
                });
                var expected = new CommentLikesResponse(1, true);
                assertEquals(expected, firstRequest.get(15, TimeUnit.SECONDS));
                assertEquals(expected, secondRequest.get(15, TimeUnit.SECONDS));
            }
            var jdbc = first.getBean(JdbcTemplate.class);
            assertThrows(DuplicateKeyException.class, () -> jdbc.update(
                    "INSERT INTO public.comment_likes (comment_id, user_id) VALUES (?, ?)", commentId, ownerId));
        }
        // A new connection pool and EntityManagerFactory must read committed PostgreSQL data.
        try (var second = start()) {
            var videos = second.getBean(VideoRepository.class);
            var comments = second.getBean(CommentRepository.class);
            var transaction = new TransactionTemplate(second.getBean(PlatformTransactionManager.class));
            try {
                var reactions = second.getBean(CommentService.class);
                assertEquals(new CommentLikesResponse(1, true), reactions.getLikes(videoId, commentId, ownerId));
                assertEquals(new CommentLikesResponse(1, false), reactions.getLikes(videoId, commentId, null));
                transaction.executeWithoutResult(status -> {
                    var video = videos.findById(videoId).orElseThrow();
                    var comment = comments.findById(commentId).orElseThrow();
                    assertEquals(path, video.getVideoPath());
                    assertEquals(ownerId, video.getOwner().getId());
                    var users = second.getBean(UserRepository.class);
                    var owner = users.findById(ownerId).orElseThrow();
                    assertEquals(email, owner.getEmail());
                    assertEquals(hash, owner.getPasswordHash());
                    assertTrue(owner.isEnabled());
                    assertFalse(users.findByEmailIgnoreCase("demo@protube.invalid").orElseThrow().isEnabled());
                    assertTrue(new BCryptPasswordEncoder(12).matches("Restart-test-password", owner.getPasswordHash()));
                    assertEquals(videoId, comment.getVideo().getId());
                    assertEquals("Committed before restart", comment.getText());
                    assertEquals(3, comment.getSourceMetadata().get("like_count"));
                    var reply = comments.findById(replyId).orElseThrow();
                    assertEquals(commentId, reply.getParent().getId());
                    assertEquals(videoId, reply.getVideoId());
                    assertEquals(ownerId, reply.getAuthor().getId());
                    assertEquals("Reply committed before restart", reply.getText());
                    var service = second.getBean(VideoService.class);
                    int page = 0;
                    boolean found = false;
                    com.tecnocampus.LS2.protube_back.dto.video.VideoPage result;
                    do {
                        result = service.getVideos(page++, 12);
                        found = result.items().stream().anyMatch(item -> item.id().equals(videoId)
                                && item.title().equals(video.getTitle()));
                    } while (!found && result.hasNext());
                    assertTrue(found);
                });
            } finally {
                // Only records inserted by this test; never truncate, drop, or delete another user's data.
                transaction.executeWithoutResult(status -> {
                    second.getBean(CommentLikeRepository.class).removeLike(commentId, ownerId);
                    comments.deleteById(replyId);
                    comments.flush();
                    comments.deleteById(commentId);
                    comments.flush();
                    videos.deleteById(videoId);
                    videos.flush();
                    second.getBean(UserRepository.class).deleteById(ownerId);
                });
            }
        }
    }
}
