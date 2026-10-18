create table public.video_views
(
    id        bigint generated always as identity
        primary key,
    video_id  bigint                                             not null
        references public.videos,
    user_id   bigint
        references public.users,
    viewed_at timestamp with time zone default CURRENT_TIMESTAMP not null
);

alter table public.video_views
    owner to postgres;

create index video_views_video_date_idx
    on public.video_views (video_id, viewed_at);

create index video_views_user_idx
    on public.video_views (user_id);

grant delete, insert, select, update on public.video_views to admin;

