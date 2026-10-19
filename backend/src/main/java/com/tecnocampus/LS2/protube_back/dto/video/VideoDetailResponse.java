package com.tecnocampus.LS2.protube_back.dto.video;

import java.math.BigDecimal;
import java.util.List;

public record VideoDetailResponse(
        Long id,
        String title,
        String user,
        BigDecimal duration,
        String description,
        String thumbnailUrl,
        String videoUrl,
        List<CommentResponse> comments
) {}
