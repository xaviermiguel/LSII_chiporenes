package com.tecnocampus.LS2.protube_back.services;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.tecnocampus.LS2.protube_back.repository.VideoRepository;
import com.tecnocampus.LS2.protube_back.model.Video;

import java.util.List;

@Service
public class VideoService {
    private final VideoRepository videoRepository;

    public VideoService(VideoRepository videoRepository) {
        this.videoRepository = videoRepository;
    }

    @Transactional(readOnly = true)
    public List<String> getVideos() {
        return videoRepository.findAllByOrderByIdAsc().stream().map(Video::getTitle).toList();
    }
}

