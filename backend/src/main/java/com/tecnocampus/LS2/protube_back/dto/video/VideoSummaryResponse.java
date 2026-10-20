package com.tecnocampus.LS2.protube_back.dto.video;

import java.math.BigDecimal;

public record VideoSummaryResponse (
        Long id,
        String title,
        String user,
        BigDecimal duration,
        String thumbnailUrl
){ }
