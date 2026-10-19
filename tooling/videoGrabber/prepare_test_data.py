"""Prepare a deterministic import manifest; never change the video store or database."""

import argparse
import hashlib
import json
import math
import os
from datetime import datetime, timezone
from pathlib import Path


def nonempty(value, field):
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{field} must be non-empty text")
    return value


def positive(value, field, integer=False):
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{field} must be a positive number")
    if not math.isfinite(value) or value <= 0 or (integer and not isinstance(value, int)):
        raise ValueError(f"{field} must be a positive {'integer' if integer else 'number'}")
    return value


def instant(value):
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError("timestamp must be epoch seconds")
    return datetime.fromtimestamp(value, timezone.utc).isoformat()


def prepare(store, page_size=12, without_comments=None):
    """Map source data to documented SQL columns, without inventing database IDs."""
    store = Path(store).resolve(strict=True)
    if not store.is_dir():
        raise ValueError("store must be a directory")
    if isinstance(page_size, bool) or not isinstance(page_size, int) or page_size < 1:
        raise ValueError("page_size must be a positive integer")
    videos = []
    ids = set()
    for source in sorted(store.glob("*.json")):
        try:
            data = json.loads(source.read_text(encoding="utf-8-sig"))
            identifier = data["id"]
            if type(identifier) is not int or identifier < 0 or source.stem != str(identifier):
                raise ValueError("filename must match the non-negative integer id")
            if identifier in ids:
                raise ValueError("duplicate source id")
            ids.add(identifier)
            for suffix in (".mp4", ".webp"):
                media = store / f"{identifier}{suffix}"
                if not media.is_file() or media.stat().st_size == 0:
                    raise ValueError(f"missing or empty {media.name}")
                if media.resolve().parent != store:
                    raise ValueError(f"{media.name} resolves outside the store")
            meta = data["meta"]
            title = nonempty(data["title"], "title")
            if len(title) > 255:
                raise ValueError("title exceeds the SQL limit of 255 characters")
            comments = []
            source_comments = meta.get("comments", [])
            if not isinstance(source_comments, list):
                raise ValueError("meta.comments must be an array")
            keys = set()
            for comment in source_comments:
                text = nonempty(comment["text"], "comment.text")
                author = nonempty(comment["author"], "comment.author")
                created = instant(comment["timestamp"])
                identity = json.dumps([text, author, created], ensure_ascii=False, separators=(",", ":"))
                key = hashlib.sha256(identity.encode("utf-8")).hexdigest()
                if key in keys:
                    continue
                keys.add(key)
                comments.append({"text": text, "external_author": author, "created_at": created,
                                 "source_metadata": {"video_grabber_key": key,
                                                     "like_count": comment.get("like_count", 0)}})
            videos.append({
                "source_id": identifier,
                "video_path": f"{identifier}.mp4",
                "thumbnail_path": f"{identifier}.webp",
                "title": title,
                "description": nonempty(meta["description"], "description"),
                "external_author": nonempty(data["user"], "user"),
                "published_at": instant(data["timestamp"]),
                "duration_seconds": positive(data["duration"], "duration"),
                "width": positive(data["width"], "width", integer=True),
                "height": positive(data["height"], "height", integer=True),
                "source_metadata": {"video_grabber_id": identifier},
                "comments": comments,
            })
        except (KeyError, TypeError, ValueError, OverflowError, OSError) as exc:
            raise ValueError(f"{source.name}: {exc}") from exc
    videos.sort(key=lambda video: video["source_id"])
    if len(videos) <= page_size:
        raise ValueError(f"need more than {page_size} videos to exercise additional loading")
    if without_comments is not None:
        selected = next((video for video in videos if video["source_id"] == without_comments), None)
        if selected is None:
            raise ValueError("requested video without comments does not exist")
        selected["comments"] = []
        selected["source_metadata"]["test_without_comments"] = True
    if not any(not video["comments"] for video in videos):
        raise ValueError("all videos have comments; select --without-comments ID explicitly")
    if not any(video["comments"] for video in videos):
        raise ValueError("need at least one video with comments")
    return {"format_version": 1, "page_size": page_size, "videos": videos}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--store", default=os.environ.get("ENV_PROTUBE_STORE_DIR"))
    parser.add_argument("--page-size", type=int, default=12)
    parser.add_argument("--without-comments", type=int)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if not args.store:
        parser.error("set --store or ENV_PROTUBE_STORE_DIR")
    try:
        store = Path(args.store).resolve(strict=True)
        output = args.output.resolve()
        if output == store or store in output.parents:
            raise ValueError("output must be outside the original store")
        manifest = prepare(store, args.page_size, args.without_comments)
        # Exclusive creation protects previous preparations and any unrelated file.
        with output.open("x", encoding="utf-8", newline="\n") as stream:
            json.dump(manifest, stream, ensure_ascii=False, indent=2, allow_nan=False)
            stream.write("\n")
    except (OSError, ValueError) as exc:
        parser.error(str(exc))
    videos = manifest["videos"]
    print(f"Prepared {len(videos)} videos, {sum(len(v['comments']) for v in videos)} comments; no database writes.")


if __name__ == "__main__":
    main()
