create table public.tags
(
    id   bigint generated always as identity
        primary key,
    name varchar(100) not null
        constraint tags_name_valid
            check (((name)::text = btrim((name)::text)) AND (length((name)::text) > 0))
);

alter table public.tags
    owner to postgres;

create unique index tags_name_unique
    on public.tags (lower(name::text));

grant delete, insert, select, update on public.tags to admin;

