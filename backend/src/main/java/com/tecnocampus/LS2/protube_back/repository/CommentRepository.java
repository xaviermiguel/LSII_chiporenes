package com.tecnocampus.LS2.protube_back.repository;

import com.tecnocampus.LS2.protube_back.model.Comment;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CommentRepository extends JpaRepository<Comment, Long> {
    List<Comment> findByVideoIdOrderByCreatedAtAscIdAsc(Long videoId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from Comment c where c.id = :commentId and c.videoId = :videoId")
    Optional<Comment> lockForReaction(Long videoId, Long commentId);

    @Query(value = """
        SELECT id FROM public.comments
        WHERE video_id = :videoId AND parent_id IS NULL
        ORDER BY id FOR UPDATE
        """, nativeQuery = true)
    List<Long> lockMainCommentsForVideoDeletion(Long videoId);

    @Modifying
    @Query(value = """
        DELETE FROM public.comment_likes
        WHERE comment_id IN (
            SELECT id
            FROM public.comments
            WHERE video_id = :videoId
        )
        """, nativeQuery = true)
    int deleteLikesByVideoId(@Param("videoId") Long videoId);

    @Modifying
    @Query(value = """
        DELETE FROM public.comments
        WHERE video_id = :videoId
        """, nativeQuery = true)
    int deleteCommentsByVideoId(@Param("videoId") Long videoId);
}
