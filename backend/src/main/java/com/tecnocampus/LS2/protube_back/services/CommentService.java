package com.tecnocampus.LS2.protube_back.services;

import com.tecnocampus.LS2.protube_back.dto.video.CommentResponse;
import com.tecnocampus.LS2.protube_back.model.Comment;
import com.tecnocampus.LS2.protube_back.repository.CommentRepository;
import com.tecnocampus.LS2.protube_back.repository.UserRepository;
import com.tecnocampus.LS2.protube_back.repository.VideoRepository;
import com.tecnocampus.LS2.protube_back.services.exceptions.AuthenticationRequiredException;
import com.tecnocampus.LS2.protube_back.services.exceptions.CommentNotFoundException;
import com.tecnocampus.LS2.protube_back.services.exceptions.InvalidCommentException;
import com.tecnocampus.LS2.protube_back.services.exceptions.VideoNotFoundException;
import jakarta.transaction.Transactional;
import com.tecnocampus.LS2.protube_back.model.User;

import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;

@Service
public class CommentService {
    private final CommentRepository commentRepository;
    private final VideoRepository videoRepository;
    private final UserRepository userRepository;
    private final int maxLength;

    public CommentService (
            CommentRepository commentRepository,
            VideoRepository videoRepository,
            UserRepository userRepository,
            @Value("${protube.comments.max-length}") int maxLength
    ){
        this.commentRepository = commentRepository;
        this.videoRepository = videoRepository;
        this.userRepository = userRepository;
        this.maxLength = maxLength;
    }
    @Transactional
    public CommentResponse publishComment(Long videoId, Long authorId, String text) {
        return publish(videoId, null, authorId, text);
    }

    @Transactional
    public CommentResponse publishReply(Long videoId, Long commentId, Long authorId, String text) {
        return publish(videoId, commentId, authorId, text);
    }

    private CommentResponse publish(Long videoId, Long parentId, Long authorId, String text) {
        if (authorId == null) {
            throw new AuthenticationRequiredException();
        }
        var author = userRepository.findById(authorId)
                .filter(User::isEnabled)
                .orElseThrow(AuthenticationRequiredException::new);
        if (text == null || text.isBlank()) {
            throw new InvalidCommentException(
                    "Escribe un comentario antes de publicar");
        }
        if (text.length() > maxLength) {
            throw new InvalidCommentException(
                    "EL comentario supera el limite de " +maxLength + " caracteres por comentario."
            );

        }
        if (!videoRepository.existsById(videoId)) {
            throw new VideoNotFoundException();
        }
        var comment = new Comment();
        comment.setVideoId(videoId);
        if (parentId != null) {
            var parent = commentRepository.findById(parentId)
                    .filter(candidate -> videoId.equals(candidate.getVideoId()))
                    .orElseThrow(CommentNotFoundException::new);
            if (parent.getParentId() != null) {
                throw new InvalidCommentException("Solo se puede responder a comentarios principales.");
            }
            comment.setParentId(parent.getId());
        }
        comment.setAuthor(author);
        comment.setText(text);

        var saved = commentRepository.save(comment);
        return new CommentResponse(
                saved.getId(),
                saved.getText(),
                saved.getAuthor().getDisplayName(),
                saved.getCreatedAt(),
                saved.getParentId()
        );
    }



}
