package com.tecnocampus.LS2.protube_back.repository;

import com.tecnocampus.LS2.protube_back.model.Comment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Long> {
    List<Comment> findByVideoIdOrderByCreatedAtAscIdAsc(Long videoId);
}
