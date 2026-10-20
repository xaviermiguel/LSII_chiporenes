package com.tecnocampus.LS2.protube_back.dto.video;

import java.time.Instant;

public record CommentResponse (
        Long id,
        String author,
        String text,
        Instant createdAt
){}
