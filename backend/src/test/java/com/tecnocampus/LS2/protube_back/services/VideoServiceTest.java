package com.tecnocampus.LS2.protube_back.services;

import org.junit.jupiter.api.Test;
import com.tecnocampus.LS2.protube_back.model.Video;
import com.tecnocampus.LS2.protube_back.repository.VideoRepository;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

class VideoServiceTest {

    VideoRepository repository = mock(VideoRepository.class);
    VideoService videoService = new VideoService(repository);


    @Test
    void readsStoredTitlesWithoutChangingTheApiContract() {
        var first = new Video();
        first.setTitle("First video");
        var second = new Video();
        second.setTitle("Second video");
        when(repository.findAllByOrderByIdAsc()).thenReturn(List.of(first, second));
        assertEquals(List.of("First video", "Second video"), videoService.getVideos());
        verify(repository).findAllByOrderByIdAsc();
    }

    @Test
    void returnsEmptyCatalogWithoutInventingData() {
        when(repository.findAllByOrderByIdAsc()).thenReturn(List.of());
        assertEquals(List.of(), videoService.getVideos());
    }

}
