create table public.videos
(
    id               bigint generated always as identity
        primary key,
    owner_id         bigint
        references public.users,
    category_id      bigint
        references public.categories,
    title            varchar(255)                                       not null
        constraint videos_title_not_empty
            check (length(btrim((title)::text)) > 0),
    description      text                                               not null
        constraint videos_description_not_empty
            check (length(btrim(description)) > 0),
    video_path       text                                               not null
        unique
        constraint videos_path_not_empty
            check (length(btrim(video_path)) > 0),
    thumbnail_path   text                                               not null
        constraint videos_thumbnail_not_empty
            check (length(btrim(thumbnail_path)) > 0),
    duration_seconds numeric(12, 2)
        constraint videos_duration_positive
            check ((duration_seconds IS NULL) OR (duration_seconds > (0)::numeric)),
    width            integer
        constraint videos_width_positive
            check ((width IS NULL) OR (width > 0)),
    height           integer
        constraint videos_height_positive
            check ((height IS NULL) OR (height > 0)),
    published_at     timestamp with time zone default CURRENT_TIMESTAMP not null,
    external_author  text
        constraint videos_external_author_not_empty
            check ((external_author IS NULL) OR (length(btrim(external_author)) > 0)),
    source_metadata  jsonb                    default '{}'::jsonb       not null
        constraint videos_source_metadata_object
            check (jsonb_typeof(source_metadata) = 'object'::text),
    constraint videos_author_required
        check ((owner_id IS NOT NULL) OR (external_author IS NOT NULL))
);

alter table public.videos
    owner to postgres;

create index videos_owner_idx
    on public.videos (owner_id);

create index videos_category_idx
    on public.videos (category_id);

create index videos_published_idx
    on public.videos (published_at, id);

grant delete, insert, select, update on public.videos to admin;

