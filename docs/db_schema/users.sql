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

alter table public.users
    owner to postgres;

create unique index users_email_unique
    on public.users (lower(email::text));

grant delete, insert, select, update on public.users to admin;

