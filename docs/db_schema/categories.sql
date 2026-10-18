create table public.categories
(
    id   bigint generated always as identity
        primary key,
    name varchar(100) not null
        constraint categories_name_valid
            check (((name)::text = btrim((name)::text)) AND (length((name)::text) > 0))
);

alter table public.categories
    owner to postgres;

create unique index categories_name_unique
    on public.categories (lower(name::text));

grant delete, insert, select, update on public.categories to admin;

