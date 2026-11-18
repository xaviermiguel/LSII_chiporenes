package com.tecnocampus.LS2.protube_back.model;

import jakarta.persistence.*;

import java.io.Serializable;
import java.time.Instant;

@Entity
@Table(name = "comment_likes", schema = "public")
@IdClass(CommentLike.Key.class)
public class CommentLike {
    @Id
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "comment_id")
    private Comment comment;

    @Id
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected CommentLike() {
    }

    public CommentLike(Comment comment, User user) {
        this.comment = comment;
        this.user = user;
        this.createdAt = Instant.now();
    }

    public record Key(Long comment, Long user) implements Serializable {
    }
}
