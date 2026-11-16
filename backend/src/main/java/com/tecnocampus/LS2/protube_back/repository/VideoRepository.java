package com.tecnocampus.LS2.protube_back.repository;

import com.tecnocampus.LS2.protube_back.model.Video;
import org.springframework.data.domain.Page;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface VideoRepository extends JpaRepository<Video, Long> {
    @Query("""
        select v from Video v
        where lower(v.title) like :pattern escape '!'
           or lower(v.description) like :pattern escape '!'
        order by case when lower(v.title) like :pattern escape '!' then 0 else 1 end,
                 v.id asc
        """)
    Slice<Video> search(@Param("pattern") String pattern, Pageable pageable);

    List<Video> findAllByOrderByIdAsc();
    Slice<Video> findAllByOrderByIdAsc(Pageable pageable);
    Optional<Video> findByVideoPath(String videoPath);
    Page<Video> findByOwnerIdOrderByIdDesc(
            Long ownerId,
            Pageable pageable
    );
    @Modifying
    @Query(value = """
        DELETE FROM public.video_tags
        WHERE video_id = :videoId
        """, nativeQuery = true)
    int deleteTagLinksByVideoId(@Param("videoId") Long videoId);

    @Modifying
    @Query(value = """
        DELETE FROM public.video_views
        WHERE video_id = :videoId
        """, nativeQuery = true)
    int deleteViewsByVideoId(@Param("videoId") Long videoId);
}
