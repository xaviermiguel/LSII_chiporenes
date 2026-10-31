package com.tecnocampus.LS2.protube_back.dto.video;

import org.springframework.web.multipart.MultipartFile;

public record VideoUploadRequest(
        String title,
        String description,
        MultipartFile video,
        MultipartFile thumbnail
) {
}
