"""Verify the real Compose increment in an isolated project, retaining its volumes."""

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
    parser.add_argument("--no-comments-id", type=int, default=0)
    parser.add_argument("--skip-build", action="store_true")
    args = parser.parse_args()
    if not args.project.startswith("protube-check-"):
        parser.error("Use an isolated project name beginning with protube-check-")
    if shutil.disk_usage(ROOT).free < 3 * 1024**3:
        raise RuntimeError("Free at least 3 GiB on the project drive; also check Docker's storage drive")
    store = args.video_dir.resolve(strict=True)
    sources = [json.loads(path.read_text(encoding="utf-8-sig")) for path in store.glob("*.json")]
    assert len(sources) > 12, "Supply the complete task 4 dataset"
    origin = f"http://127.0.0.1:{args.port}"
    env = dict(os.environ, PROTUBE_VIDEO_DIR=str(store), PROTUBE_HTTP_PORT=str(args.port),
               PROTUBE_PUBLIC_URL=origin, PROTUBE_BIND_ADDRESS="127.0.0.1",
               PROTUBE_NO_COMMENTS_ID=str(args.no_comments_id), ENV_PROTUBE_DB_PASS="",
               ENV_PROTUBE_DB="protube_db", ENV_PROTUBE_DB_USER="protube_user")
    compose = ["docker", "compose", "--project-name", args.project]

    def run(*arguments, capture=False):
        return subprocess.run(compose + list(arguments), cwd=ROOT, env=env, check=True,
                              stdout=subprocess.PIPE if capture else None,
                              text=capture, encoding="utf-8" if capture else None).stdout

    def sql(statement):
        return run("exec", "-T", "db", "sh", "-c",
                   'exec psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "$1"',
                   "sh", statement, capture=True).strip()

    def get(path, headers=None):
        request = urllib.request.Request(origin + path, headers=headers or {})
        with urllib.request.urlopen(request, timeout=30) as response:
            return response.status, response.read(), response.headers

    def hashes():
        result = {}
        for path in store.iterdir():
            if path.is_file() and path.suffix in (".json", ".mp4", ".webp"):
                with path.open("rb") as stream:
                    result[path.name] = hashlib.file_digest(stream, "sha256").hexdigest()
        return result

    before_files = hashes()
    run("config", "--quiet")
    build = [] if args.skip_build else ["--build"]
    run("up", *build, "-d", "--wait", "--wait-timeout", "300")

    def verify_http():
        status, page, _ = get("/")
        assert status == 200 and b'id="root"' in page, "Packaged frontend missing"
        asset = re.search(rb'src="(/assets/[^\"]+\.js)"', page)
        assert asset and get(asset.group(1).decode())[0] == 200, "Frontend bundle unavailable"
        items = []
        for number in range(len(sources) + 1):
            status, body, _ = get(f"/api/videos?page={number}&size=12")
            data = json.loads(body)
            assert status == 200 and data["page"] == number and data["size"] == 12
            items.extend(data["items"])
            if not data["hasNext"]:
                break
        else:
            raise AssertionError("Pagination did not terminate")
        assert len(items) == len(sources) == len({item["id"] for item in items})
        assert sorted(item["title"] for item in items) == sorted(source["title"] for source in sources)
        details = [json.loads(get(f'/api/videos/{item["id"]}')[1]) for item in items]
        assert any(not detail["comments"] for detail in details), "No empty-comments example"
        assert any(detail["comments"] for detail in details), "No imported comments"
        first = details[0]
        status, thumbnail, _ = get(first["thumbnailUrl"])
        assert status == 200 and hashlib.sha256(thumbnail).hexdigest() == before_files[first["thumbnailUrl"].split("/")[-1]]
        status, video, headers = get(first["videoUrl"], {"Range": "bytes=0-63"})
        with (store / first["videoUrl"].split("/")[-1]).open("rb") as stream:
            assert status == 206 and video == stream.read(64), "Video range unavailable"
        assert headers["Content-Range"].startswith("bytes 0-63/")
        return len(items), sum(len(detail["comments"]) for detail in details)

    def snapshot():
        return sql("""select json_build_object(
            'videos', (select json_agg(v order by id) from public.videos v),
            'comments', (select json_agg(c order by id) from public.comments c))::text""")

    counts = verify_http()
    assert int(sql("select count(*) from public.flyway_schema_history where success")) > 0
    assert int(sql("select count(*) from public.flyway_schema_history where not success")) == 0
    assert int(sql("select count(*) from public.videos")) == counts[0]
    assert int(sql("select count(*) from public.comments")) == counts[1] > 0
    first = snapshot()
    credential = run("exec", "-T", "app", "sha256sum", "/run/protube-secrets/db_password", capture=True)
    print(f"Validated PostgreSQL/Flyway, {counts[0]} videos, {counts[1]} comments, pagination, details and media", flush=True)
    run("down")  # Retain database and credentials: never pass -v.
    run("up", "-d", "--wait", "--wait-timeout", "300")
    assert verify_http() == counts
    assert first == snapshot(), "Records changed or duplicated after recreation"
    assert credential == run("exec", "-T", "app", "sha256sum", "/run/protube-secrets/db_password", capture=True)
    assert before_files == hashes(), "Original media or metadata changed"
    print(f"PASS: container recreation, unchanged rows/credentials and {len(before_files)} original files. {origin}")
    print(f"Retained project: {args.project}. Stop with: docker compose --project-name {args.project} down")


if __name__ == "__main__":
    main()
