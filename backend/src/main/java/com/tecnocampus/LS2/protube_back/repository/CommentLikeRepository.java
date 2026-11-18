package com.tecnocampus.LS2.protube_back.repository;

import com.tecnocampus.LS2.protube_back.dto.video.CommentLikesResponse;
import com.tecnocampus.LS2.protube_back.model.CommentLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface CommentLikeRepository extends JpaRepository<CommentLike, CommentLike.Key> {
    @Modifying
    @Query("delete from CommentLike l where l.comment.id = :commentId and l.user.id = :userId")
    void removeLike(Long commentId, Long userId);

    @Query("""
        select new com.tecnocampus.LS2.protube_back.dto.video.CommentLikesResponse(
            count(l), case when count(case when l.user.id = :userId then 1 else null end) > 0
                then true else false end)
        from CommentLike l where l.comment.id = :commentId
        """)
    CommentLikesResponse getLikes(Long commentId, Long userId);
}
