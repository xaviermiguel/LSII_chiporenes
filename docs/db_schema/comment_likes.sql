create table public.comment_likes
(
    comment_id bigint                                             not null
        references public.comments,
    user_id    bigint                                             not null
        references public.users,
    created_at timestamp with time zone default CURRENT_TIMESTAMP not null,
    primary key (comment_id, user_id)
);

alter table public.comment_likes
    owner to postgres;

create index comment_likes_user_idx
    on public.comment_likes (user_id);

grant delete, insert, select, update on public.comment_likes to admin;

