package com.tecnocampus.LS2.protube_back.repository;

import com.tecnocampus.LS2.protube_back.model.Video;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface VideoRepository extends JpaRepository<Video, Long> {
    List<Video> findAllByOrderByIdAsc();
    Optional<Video> findByVideoPath(String videoPath);
}
