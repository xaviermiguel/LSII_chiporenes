package com.tecnocampus.LS2.protube_back.dto.video;

import org.springframework.web.multipart.MultipartFile;
import java.util.List;

public record VideoUploadRequest(
        String title,
        String description,
        List<String> tags,
        MultipartFile video,
        MultipartFile thumbnail
) {
}
