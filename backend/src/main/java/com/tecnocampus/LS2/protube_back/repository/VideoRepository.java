package com.tecnocampus.LS2.protube_back.repository;

import com.tecnocampus.LS2.protube_back.model.Video;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;

import java.util.List;
import java.util.Optional;

public interface VideoRepository extends JpaRepository<Video, Long> {
    List<Video> findAllByOrderByIdAsc();
    Slice<Video> findAllByOrderByIdAsc(Pageable pageable);
    Optional<Video> findByVideoPath(String videoPath);
}
