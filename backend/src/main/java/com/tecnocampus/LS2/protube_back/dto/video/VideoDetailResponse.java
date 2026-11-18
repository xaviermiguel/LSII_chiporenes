package com.tecnocampus.LS2.protube_back.dto.video;

import java.math.BigDecimal;
import java.util.List;

public record VideoDetailResponse(
        Long id,
        String title,
        String user,
        BigDecimal duration,
        String thumbnailUrl,
        String description,
        String videoUrl,
        List<String> tags,
        List<CommentResponse> comments,
        Long ownerId,
        Long authorId,
        Long viewCount,
        Long likeCount,
        String channel,
        Long channelFollowerCount,
        CategoryResponse category
) {
}
