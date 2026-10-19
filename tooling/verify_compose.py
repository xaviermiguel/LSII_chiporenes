"""Verify task 11 using an isolated Compose project; never remove persistent volumes."""

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import urllib.request
import uuid


ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--video-dir", type=Path, default=ROOT / "videos")
    parser.add_argument("--project", default="protube-check-" + uuid.uuid4().hex[:8])
    parser.add_argument("--port", type=int, default=18080)
    parser.add_argument("--min-free-gib", type=float, default=3)
    args = parser.parse_args()
    if args.min_free_gib < 0:
        parser.error("--min-free-gib must be non-negative")
    free_gib = shutil.disk_usage(ROOT).free / 1024**3
    if free_gib < args.min_free_gib:
        raise RuntimeError(f"Only {free_gib:.2f} GiB free on the project drive; "
                           f"free at least {args.min_free_gib:g} GiB before downloading/building Docker images")
    store = args.video_dir.resolve(strict=True)
    metadata = sorted(store.glob("*.json"), key=lambda path: int(path.stem))
    if len(metadata) <= 12:
        raise RuntimeError("Provide the task 4 store with more than 12 videos")
    env = dict(os.environ, PROTUBE_VIDEO_DIR=str(store), PROTUBE_HTTP_PORT=str(args.port),
               PROTUBE_BIND_ADDRESS="127.0.0.1", ENV_PROTUBE_DB="protube_db",
               ENV_PROTUBE_DB_USER="protube_user", ENV_PROTUBE_DB_PASS="")
    compose = ["docker", "compose", "--project-name", args.project]

    def run(*arguments, capture=False):
        result = subprocess.run(compose + list(arguments), cwd=ROOT, env=env, check=True,
                                stdout=subprocess.PIPE if capture else None, text=capture,
                                encoding="utf-8" if capture else None)
        return result.stdout if capture else None

    def get(path, headers=None):
        request = urllib.request.Request(f"http://127.0.0.1:{args.port}{path}", headers=headers or {})
        with urllib.request.urlopen(request, timeout=30) as response:
            return response.status, response.read(), response.headers

    def sql(statement):
        return run("exec", "-T", "db", "sh", "-c",
                   'exec psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "$1"',
                   "sh", statement, capture=True).strip()

    def files():
        result = {}
        for path in store.iterdir():
            if path.is_file() and path.suffix in (".json", ".mp4", ".webp"):
                with path.open("rb") as stream:
                    result[path.name] = hashlib.file_digest(stream, "sha256").hexdigest()
        return result

    before_files = files()
    run("config", "--quiet")
    print(f"Starting isolated Compose project {args.project}", flush=True)
    run("up", "--build", "-d", "--wait", "--wait-timeout", "300")

    def verify_http():
        status, page, _ = get("/")
        assert status == 200 and b'id="root"' in page, "Frontend index missing"
        asset = re.search(rb'src="(/assets/[^\"]+\.js)"', page)
        assert asset, "Compiled frontend bundle missing from index"
        assert get(asset.group(1).decode())[0] == 200, "Frontend bundle unavailable"
        status, catalog, _ = get("/api/videos")
        titles = json.loads(catalog)
        assert status == 200 and len(titles) == len(metadata), "Unexpected catalog size"
        for path in metadata:
            assert json.loads(path.read_text(encoding="utf-8-sig"))["title"] in titles
        identifier = metadata[0].stem
        status, thumbnail, _ = get(f"/media/{identifier}.webp")
        assert status == 200 and hashlib.sha256(thumbnail).hexdigest() == before_files[f"{identifier}.webp"]
        status, video, headers = get(f"/media/{identifier}.mp4", {"Range": "bytes=0-63"})
        with (store / f"{identifier}.mp4").open("rb") as stream:
            assert status == 206 and video == stream.read(64), "Video range request failed"
        assert headers["Content-Range"].startswith("bytes 0-63/"), "Invalid partial response"

    def snapshot():
        return sql("""select json_build_object(
            'videos', (select json_agg(v order by id) from public.videos v),
            'comments', (select json_agg(c order by id) from public.comments c))::text""")

    verify_http()
    first = snapshot()
    assert int(sql("select count(*) from public.flyway_schema_history where version='1' and success")) == 1
    assert int(sql("select count(*) from public.comments")) > 0
    assert int(sql("""select count(*) from public.videos v where not exists
        (select 1 from public.comments c where c.video_id=v.id)""")) > 0
    assert int(sql("""select count(*) from (select video_id,source_metadata->>'video_grabber_key'
        from public.comments group by video_id,source_metadata->>'video_grabber_key'
        having count(*)>1) duplicates""")) == 0
    print("Recreating containers while retaining database, credentials and original files", flush=True)
    run("down")  # No -v: retain all data and generated credentials.
    run("up", "-d", "--wait", "--wait-timeout", "300")
    verify_http()
    assert first == snapshot(), "Records changed or duplicated after container recreation"
    assert before_files == files(), "Original media or metadata changed"
    print(f"PASS: frontend, API, media, Flyway, empty-comments case and persistent idempotent load. "
          f"Project {args.project} remains available at http://127.0.0.1:{args.port}")
    print(f"Stop without deleting data: docker compose --project-name {args.project} down")


if __name__ == "__main__":
    main()
