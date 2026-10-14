# Layered API and PostgreSQL entities

**Approved on:** 2026-10-14
**Approved by:** Xavier and Joan, confirmed by Xavier in the previous conversation.
**Used for:** Create the agreed layered API foundation and JPA model, in separately reviewed phases.

## Prompt

perfecto, podrias crear estas clases ?

Approved scope: create JPA entities for the agreed model, repositories, DTO,
mappers, services, controllers and error handling; connect the video listing to
PostgreSQL, adapt its frontend consumer and verify the changes with tests.

Context: database protube-chiporenes, schema public, PostgreSQL 18. Tables:
users, videos, categories, tags, video_tags, comments, comment_likes, video_views.
Each video has zero or one category and multiple tags through video_tags.
Comments support replies through parent_id. Duplicate video/tag assignments
and duplicate likes by the same user on a comment must be prevented.
Video and thumbnail files stay in the configured store; the database stores paths.
Preserve existing tables, data, credentials and unrelated local changes.

Approval response:
Si, yo Xavier y Joan lo confirmamos, puedes registrarlo

## Notes

This restores the previously approved prompt record deleted with the broad implementation.
Current phase: User, UserRepository and an isolated persistence test only.
The user's current instruction is: "podrias hacer ahora solo una fase de las que mencionamos?"
Reuse the previous User mapping; do not implement other entities or API layers.
Preserve .run configuration, AGENTS.md and skills. Wait for review before the next phase.
No live database schema changes. H2 is used only for the isolated test;
PostgreSQL compatibility and persistent storage across restarts remain to be verified.

Phase 2 reuses the approved DTO/mapper scope, limited to UserResponse and UserMapper.
User instruction: "perfecto, para la segunda fase podrias hacer las clases y los minimos, pero con #TODO para hacer ?"
Provide the minimal public profile mapping and TODO comments for pending mapping
and serialization tests. Do not add services or controllers. Wait for review.
