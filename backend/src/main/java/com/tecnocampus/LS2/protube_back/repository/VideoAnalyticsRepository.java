package com.tecnocampus.LS2.protube_back.repository;

import com.tecnocampus.LS2.protube_back.model.VideoView;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface VideoAnalyticsRepository extends Repository<VideoView, Long> {
    interface Metrics {
        Long getId();
        String getTitle();
        String getThumbnailPath();
        long getViews();
        long getComments();
    }

    @Query(value = """
        SELECT v.id, v.title, v.thumbnail_path AS "thumbnailPath",
               (SELECT COUNT(*) FROM public.video_views w WHERE w.video_id = v.id) AS views,
               (SELECT COUNT(*) FROM public.comments c WHERE c.video_id = v.id) AS comments
        FROM public.videos v
        WHERE v.owner_id = :ownerId
        ORDER BY v.id DESC
        """, nativeQuery = true)
    List<Metrics> findForOwner(@Param("ownerId") long ownerId);

    @Modifying
    @Query(value = """
        INSERT INTO public.video_views (video_id, user_id, viewed_at)
        SELECT id, :viewerId, CURRENT_TIMESTAMP
        FROM public.videos
        WHERE id = :videoId
        """, nativeQuery = true)
    int recordView(@Param("videoId") long videoId, @Param("viewerId") long viewerId);
}
