package com.tecnocampus.LS2.protube_back.services;

import com.tecnocampus.LS2.protube_back.dto.video.CommentResponse;
import com.tecnocampus.LS2.protube_back.dto.video.CommentLikesResponse;
import com.tecnocampus.LS2.protube_back.model.Comment;
import com.tecnocampus.LS2.protube_back.model.CommentLike;
import com.tecnocampus.LS2.protube_back.repository.CommentLikeRepository;
import com.tecnocampus.LS2.protube_back.repository.CommentRepository;
import com.tecnocampus.LS2.protube_back.repository.UserRepository;
import com.tecnocampus.LS2.protube_back.repository.VideoRepository;
import com.tecnocampus.LS2.protube_back.services.exceptions.AuthenticationRequiredException;
import com.tecnocampus.LS2.protube_back.services.exceptions.CommentNotFoundException;
import com.tecnocampus.LS2.protube_back.services.exceptions.InvalidCommentException;
import com.tecnocampus.LS2.protube_back.services.exceptions.VideoNotFoundException;
import org.springframework.transaction.annotation.Transactional;
import com.tecnocampus.LS2.protube_back.model.User;

import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;

@Service
public class CommentService {
    private final CommentRepository commentRepository;
    private final CommentLikeRepository commentLikeRepository;
    private final VideoRepository videoRepository;
    private final UserRepository userRepository;
    private final int maxLength;

    public CommentService (
            CommentRepository commentRepository,
            CommentLikeRepository commentLikeRepository,
            VideoRepository videoRepository,
            UserRepository userRepository,
            @Value("${protube.comments.max-length}") int maxLength
    ){
        this.commentRepository = commentRepository;
        this.commentLikeRepository = commentLikeRepository;
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

    @Transactional(readOnly = true)
    public CommentLikesResponse getLikes(Long videoId, Long commentId, Long userId) {
        var comment = commentRepository.findById(commentId)
                .filter(candidate -> videoId.equals(candidate.getVideoId()))
                .orElseThrow(CommentNotFoundException::new);
        requireMainComment(comment, "Solo se puede reaccionar a comentarios principales.");
        return commentLikeRepository.getLikes(commentId, userId);
    }

    @Transactional
    public CommentLikesResponse setLike(Long videoId, Long commentId, Long userId, boolean liked) {
        var user = requireEnabledUser(userId);
        // Keep writes and their response serialized for this comment until commit.
        var comment = commentRepository.lockForReaction(videoId, commentId)
                .orElseThrow(CommentNotFoundException::new);
        requireMainComment(comment, "Solo se puede reaccionar a comentarios principales.");
        if (liked) {
            if (!commentLikeRepository.existsById(new CommentLike.Key(commentId, userId))) {
                commentLikeRepository.save(new CommentLike(comment, user));
            }
        } else {
            commentLikeRepository.removeLike(commentId, userId);
        }
        return commentLikeRepository.getLikes(commentId, userId);
    }

    private User requireEnabledUser(Long userId) {
        if (userId == null) {
            throw new AuthenticationRequiredException();
        }
        return userRepository.findById(userId)
                .filter(User::isEnabled)
                .orElseThrow(AuthenticationRequiredException::new);
    }

    private void requireMainComment(Comment comment, String message) {
        if (comment.getParentId() != null) {
            throw new InvalidCommentException(message);
        }
    }

    private CommentResponse publish(Long videoId, Long parentId, Long authorId, String text) {
        var author = requireEnabledUser(authorId);
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
            requireMainComment(parent, "Solo se puede responder a comentarios principales.");
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
