package com.tecnocampus.LS2.protube_back.repository;

import com.tecnocampus.LS2.protube_back.model.Comment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Long> {
    List<Comment> findByVideoIdOrderByCreatedAtAscIdAsc(Long videoId);

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
