package com.tecnocampus.LS2.protube_back.dto.video;

import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.Instant;

public record CommentResponse(Long id, String text, String user,
                              @JsonFormat(shape = JsonFormat.Shape.STRING) Instant createdAt, Long parentId) {}
