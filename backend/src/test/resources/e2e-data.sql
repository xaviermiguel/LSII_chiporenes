-- Synthetic records in the E2E in-memory database only.
INSERT INTO public.users (id, email, password_hash, display_name, description, created_at, enabled)
VALUES (1, 'demo@protube.invalid', 'unused-test-placeholder', 'ProTube Demo', '', TIMESTAMP '2026-01-01 00:00:00', false);
INSERT INTO public.videos (id, owner_id, title, description, video_path, thumbnail_path, duration_seconds, published_at, external_author, source_metadata)
VALUES (101, 1, 'E2E first video', 'Synthetic fixture', 'fixture.mp4', 'fixture.webp', 10.00, TIMESTAMP '2026-01-01 00:00:00', 'Test channel', JSON '{}'),
       (102, 1, 'E2E second video', 'Empty comments fixture', 'fixture.mp4.second', 'fixture.webp', 20.00, TIMESTAMP '2026-01-02 00:00:00', 'Test channel', JSON '{}'),
       (103, 1, 'E2E unavailable file', 'Missing file fixture', 'missing.mp4', 'fixture.webp', 30.00, TIMESTAMP '2026-01-03 00:00:00', 'Test channel', JSON '{}');
INSERT INTO public.comments (video_id, text, created_at, external_author, source_metadata)
VALUES (101, 'E2E comment', TIMESTAMP '2026-01-01 00:00:00', 'Test commenter', JSON '{}');
