package com.tecnocampus.LS2.protube_back.dto.video;

import java.util.List;

public record VideoPage(List<VideoSummary> items, int page, int size, boolean hasNext) {}
