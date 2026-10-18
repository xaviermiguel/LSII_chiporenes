create table public.comments
(
    id              bigint generated always as identity
        primary key,
    video_id        bigint                                             not null
        references public.videos,
    author_id       bigint
        references public.users,
    parent_id       bigint,
    text            text                                               not null
        constraint comments_text_not_empty
            check (length(btrim(text)) > 0),
    created_at      timestamp with time zone default CURRENT_TIMESTAMP not null,
    external_author text
        constraint comments_external_author_not_empty
            check ((external_author IS NULL) OR (length(btrim(external_author)) > 0)),
    source_metadata jsonb                    default '{}'::jsonb       not null
        constraint comments_source_metadata_object
            check (jsonb_typeof(source_metadata) = 'object'::text),
    constraint comments_id_video_unique
        unique (id, video_id),
    constraint comments_parent_same_video_fk
        foreign key (parent_id, video_id) references public.comments (id, video_id),
    constraint comments_author_required
        check ((author_id IS NOT NULL) OR (external_author IS NOT NULL)),
    constraint comments_not_own_parent
        check ((parent_id IS NULL) OR (parent_id <> id))
);

alter table public.comments
    owner to postgres;

create index comments_video_created_idx
    on public.comments (video_id, created_at, id);

create index comments_author_idx
    on public.comments (author_id);

create index comments_parent_idx
    on public.comments (parent_id, video_id);

grant delete, insert, select, update on public.comments to admin;

