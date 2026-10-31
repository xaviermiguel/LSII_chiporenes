-- Existing users remain enabled. Authentication must enforce this flag.
alter table public.users
    add column enabled boolean default true not null;

-- Internal owner for sample videos; the random password was discarded.
-- This is a verified BCrypt hash with strength 12, not a usable shared password.
-- A conflicting reserved email intentionally fails instead of reusing an account.
insert into public.users (email, password_hash, display_name, description, enabled)
values (
    'demo@protube.invalid',
    '$2a$12$hvnBPKfEZa4DYz12SeEdeug9JLH.HwYhzacSDI7GZm6/l8RvpgtEm',
    'ProTube Demo',
    'Internal account owning the sample video catalog.',
    false
);

update public.videos
set owner_id = (
    select id from public.users where email = 'demo@protube.invalid'
)
where owner_id is null;

alter table public.videos
    alter column owner_id set not null;

-- Ownership is now mandatory even when an external author is present.
alter table public.videos
    drop constraint videos_author_required;
