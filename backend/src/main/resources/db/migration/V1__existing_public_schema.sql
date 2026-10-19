-- Original public schema from docs/db_schema, in dependency order.
-- Role ownership and grants remain the responsibility of the database administrator.


create table public.users
(
    id            bigint generated always as identity
        primary key,
    email         varchar(254)                                       not null
        constraint users_email_format
            check (((email)::text = btrim((email)::text)) AND
                   ((email)::text ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'::text)),
    password_hash text                                               not null
        constraint users_password_not_empty
            check (length(btrim(password_hash)) > 0),
    display_name  varchar(100)                                       not null
        constraint users_display_name_not_empty
            check (length(btrim((display_name)::text)) > 0),
    avatar_path   text
        constraint users_avatar_not_empty
            check ((avatar_path IS NULL) OR (length(btrim(avatar_path)) > 0)),
    description   text                     default ''::text          not null,
    created_at    timestamp with time zone default CURRENT_TIMESTAMP not null
);

create unique index users_email_unique
    on public.users (lower(email::text));

create table public.categories
(
    id   bigint generated always as identity
        primary key,
    name varchar(100) not null
        constraint categories_name_valid
            check (((name)::text = btrim((name)::text)) AND (length((name)::text) > 0))
);

create unique index categories_name_unique
    on public.categories (lower(name::text));

create table public.tags
(
    id   bigint generated always as identity
        primary key,
    name varchar(100) not null
        constraint tags_name_valid
            check (((name)::text = btrim((name)::text)) AND (length((name)::text) > 0))
);

create unique index tags_name_unique
    on public.tags (lower(name::text));

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

create index videos_owner_idx
    on public.videos (owner_id);

create index videos_category_idx
    on public.videos (category_id);

create index videos_published_idx
    on public.videos (published_at, id);

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

create index comments_video_created_idx
    on public.comments (video_id, created_at, id);

create index comments_author_idx
    on public.comments (author_id);

create index comments_parent_idx
    on public.comments (parent_id, video_id);

create table public.video_tags
(
    video_id bigint not null
        references public.videos,
    tag_id   bigint not null
        references public.tags,
    primary key (video_id, tag_id)
);

create index video_tags_tag_idx
    on public.video_tags (tag_id);

create table public.comment_likes
(
    comment_id bigint                                             not null
        references public.comments,
    user_id    bigint                                             not null
        references public.users,
    created_at timestamp with time zone default CURRENT_TIMESTAMP not null,
    primary key (comment_id, user_id)
);

create index comment_likes_user_idx
    on public.comment_likes (user_id);

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

create index video_views_video_date_idx
    on public.video_views (video_id, viewed_at);

create index video_views_user_idx
    on public.video_views (user_id);
