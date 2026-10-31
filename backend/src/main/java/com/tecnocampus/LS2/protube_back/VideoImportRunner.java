package com.tecnocampus.LS2.protube_back;

import com.tecnocampus.LS2.protube_back.services.VideoImportService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.nio.file.Path;

@Component
@ConditionalOnProperty(name = "pro_tube.import.enabled", havingValue = "true")
public class VideoImportRunner implements ApplicationRunner {
    private static final Logger LOG = LoggerFactory.getLogger(VideoImportRunner.class);
    private final VideoImportService importer;
    private final Environment environment;

    public VideoImportRunner(VideoImportService importer, Environment environment) {
        this.importer = importer;
        this.environment = environment;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        if (!importer.usesPostgres()) throw new IllegalStateException("Enable video import only with PostgreSQL (Spring profile prod)");
        var result = importer.importDirectory(
                Path.of(environment.getRequiredProperty("pro_tube.store.dir")),
                environment.getProperty("pro_tube.import.page-size", Integer.class, 12),
                environment.getProperty("pro_tube.import.no-comments-id", Long.class));
        LOG.info("Video import committed: {} videos added, {} comments added, {} videos unchanged; no-comments source ID {}",
                result.addedVideos(), result.addedComments(), result.unchangedVideos(), result.noCommentsSourceId());
    }
}
