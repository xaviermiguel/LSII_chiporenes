package com.tecnocampus.LS2.protube_back.mapper;

import com.tecnocampus.LS2.protube_back.dto.video.VideoUploadResponse;
import com.tecnocampus.LS2.protube_back.model.Video;

public class VideoMapper {
    public static VideoUploadResponse toUploadResponse(Video video) {
        return new VideoUploadResponse(
                video.getId(),
                video.getTitle(),
                video.getDescription()
        );
    }
}
