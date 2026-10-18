create table public.video_tags
(
    video_id bigint not null
        references public.videos,
    tag_id   bigint not null
        references public.tags,
    primary key (video_id, tag_id)
);

alter table public.video_tags
    owner to postgres;

create index video_tags_tag_idx
    on public.video_tags (tag_id);

grant delete, insert, select, update on public.video_tags to admin;

