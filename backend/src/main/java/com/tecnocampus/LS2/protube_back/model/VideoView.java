package com.tecnocampus.LS2.protube_back.model;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.ColumnDefault;

import java.time.Instant;

@Entity
@Table(name = "video_views", schema = "public")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class VideoView {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "video_id", nullable = false)
    private Video video;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User viewer;

    @Column(name = "viewed_at", nullable = false)
    @ColumnDefault("CURRENT_TIMESTAMP")
    private Instant viewedAt;
}