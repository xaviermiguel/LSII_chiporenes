package com.tecnocampus.LS2.protube_back.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@Entity
@Table(name = "videos", schema = "public")
@Getter
@Setter
@NoArgsConstructor
public class Video {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id")
    private User owner;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(nullable = false, columnDefinition = "text")
    private String description;

    @Column(name = "video_path", nullable = false, unique = true, columnDefinition = "text")
    private String videoPath;

    @Column(name = "thumbnail_path", nullable = false, columnDefinition = "text")
    private String thumbnailPath;

    @Column(name = "duration_seconds", precision = 12, scale = 2)
    private BigDecimal durationSeconds;

    private Integer width;
    private Integer height;

    @Column(name = "published_at", nullable = false)
    private Instant publishedAt = Instant.now();

    @Column(name = "external_author", columnDefinition = "text")
    private String externalAuthor;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "source_metadata", nullable = false)
    private Map<String, Object> sourceMetadata = new LinkedHashMap<>();
}
