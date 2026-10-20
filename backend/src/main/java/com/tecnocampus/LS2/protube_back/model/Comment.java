package com.tecnocampus.LS2.protube_back.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@Entity
@Table(name = "comments", schema = "public", uniqueConstraints =
        @UniqueConstraint(name = "comments_id_video_unique", columnNames = {"id", "video_id"}))
@Getter
@Setter
@NoArgsConstructor
public class Comment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "video_id", nullable = false)
    private Long videoId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "video_id", nullable = false, insertable = false, updatable = false)
    private Video video;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id")
    private User author;

    @Column(name = "parent_id")
    private Long parentId;

    // The existing composite FK enforces that parent and reply share a video.
    // The videoId and parentId properties own these columns for writes.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumns({
            @JoinColumn(name = "parent_id", referencedColumnName = "id", insertable = false, updatable = false),
            @JoinColumn(name = "video_id", referencedColumnName = "video_id", insertable = false, updatable = false)
    })
    private Comment parent;

    @Column(nullable = false, columnDefinition = "text")
    private String text;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "external_author", columnDefinition = "text")
    private String externalAuthor;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "source_metadata", nullable = false)
    private Map<String, Object> sourceMetadata = new LinkedHashMap<>();

    public void setVideo(Video video) {
        this.video = video;
        this.videoId = video == null ? null : video.getId();
    }

    public void setParent(Comment parent) {
        this.parent = parent;
        this.parentId = parent == null ? null : parent.getId();
    }
}
