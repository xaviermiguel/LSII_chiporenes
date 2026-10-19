package com.tecnocampus.LS2.protube_back;

import com.tecnocampus.LS2.protube_back.services.VideoImportService;
import org.junit.jupiter.api.Test;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.mock.env.MockEnvironment;

import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class VideoImportRunnerTest {
    @Test
    void passesConfiguredDirectoryAndSelectionToImporter() throws Exception {
        var service = mock(VideoImportService.class);
        when(service.usesPostgres()).thenReturn(true);
        var environment = new MockEnvironment().withProperty("pro_tube.store.dir", "configured-store")
                .withProperty("pro_tube.import.page-size", "2")
                .withProperty("pro_tube.import.no-comments-id", "1");
        when(service.importDirectory(Path.of("configured-store"), 2, 1L))
                .thenReturn(new VideoImportService.Result(3, 2, 0, 1));
        new VideoImportRunner(service, environment).run(new DefaultApplicationArguments());
        verify(service).importDirectory(Path.of("configured-store"), 2, 1L);
    }

    @Test
    void rejectsAnImportIntoTemporaryH2() throws Exception {
        var service = mock(VideoImportService.class);
        assertThrows(IllegalStateException.class, () ->
                new VideoImportRunner(service, new MockEnvironment()).run(new DefaultApplicationArguments()));
        verify(service, never()).importDirectory(any(), anyInt(), any());
    }
}
