package com.tecnocampus.LS2.protube_back.mapper;

import com.tecnocampus.LS2.protube_back.dto.video.CommentResponse;
import com.tecnocampus.LS2.protube_back.dto.video.VideoUploadResponse;
import com.tecnocampus.LS2.protube_back.model.Comment;
import com.tecnocampus.LS2.protube_back.model.Video;

public class VideoMapper {
    public static CommentResponse toCommentResponse(Comment comment) {
        var author = comment.getAuthor();
        return new CommentResponse(
                comment.getId(),
                comment.getText(),
                author == null ? comment.getExternalAuthor() : author.getDisplayName(),
                comment.getCreatedAt(),
                comment.getParentId(),
                author == null ? null : author.getId()
        );
    }

    public static VideoUploadResponse toUploadResponse(Video video) {
        return new VideoUploadResponse(
                video.getId(),
                video.getTitle(),
                video.getDescription()
        );
    }
}
