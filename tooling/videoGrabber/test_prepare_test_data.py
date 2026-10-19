import copy
import json
import tempfile
import unittest
from pathlib import Path

from prepare_test_data import prepare


class PrepareTestDataTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.store = Path(self.temp.name)
        self.data = {"id": 0, "title": "Vídeo", "user": "Canal", "timestamp": 1408396680,
                     "duration": 72.0, "width": 1920, "height": 1080,
                     "meta": {"description": "Descripción", "comments": [
                         {"text": "Comentario", "author": "Autor", "timestamp": 1791356400,
                          "like_count": 1}]}}
        for identifier in range(3):
            data = copy.deepcopy(self.data)
            data["id"] = identifier
            if identifier == 2:
                data["meta"]["comments"] = []
            self.write(identifier, data)
            for suffix in ("mp4", "webp"):
                (self.store / f"{identifier}.{suffix}").write_bytes(b"fixture")

    def write(self, identifier, data):
        (self.store / f"{identifier}.json").write_text(json.dumps(data), encoding="utf-8")

    def test_metadata_comments_and_relative_media_paths(self):
        videos = prepare(self.store, 2)["videos"]
        self.assertEqual([0, 1, 2], [v["source_id"] for v in videos])
        first = videos[0]
        self.assertEqual("0.mp4", first["video_path"])
        self.assertEqual("0.webp", first["thumbnail_path"])
        self.assertEqual("Descripción", first["description"])
        self.assertEqual("Canal", first["external_author"])
        self.assertEqual(72, first["duration_seconds"])
        self.assertEqual(1920, first["width"])
        self.assertEqual(1080, first["height"])
        self.assertEqual("2014-08-18T21:18:00+00:00", first["published_at"])
        comment = first["comments"][0]
        self.assertEqual("Comentario", comment["text"])
        self.assertEqual("Autor", comment["external_author"])
        self.assertEqual(1, comment["source_metadata"]["like_count"])
        self.assertEqual([], videos[2]["comments"])

    def test_repeat_is_deterministic_and_does_not_modify_sources(self):
        before = {p.name: p.read_bytes() for p in self.store.iterdir()}
        self.assertEqual(prepare(self.store, 2), prepare(self.store, 2))
        self.assertEqual(before, {p.name: p.read_bytes() for p in self.store.iterdir()})

    def test_controlled_empty_case_does_not_change_original(self):
        for identifier in range(3):
            data = copy.deepcopy(self.data)
            data["id"] = identifier
            self.write(identifier, data)
        with self.assertRaisesRegex(ValueError, "all videos have comments"):
            prepare(self.store, 2)
        manifest = prepare(self.store, 2, without_comments=1)
        self.assertEqual([], manifest["videos"][1]["comments"])
        self.assertEqual(1, len(json.loads((self.store / "1.json").read_text())["meta"]["comments"]))

    def test_duplicate_comment_identity_is_stable(self):
        self.data["meta"]["comments"] *= 2
        self.write(0, self.data)
        first = prepare(self.store, 2)["videos"][0]["comments"]
        self.assertEqual(1, len(first))
        self.data["meta"]["comments"][0]["like_count"] = 5
        self.write(0, self.data)
        self.assertEqual(first[0]["source_metadata"]["video_grabber_key"],
                         prepare(self.store, 2)["videos"][0]["comments"][0]["source_metadata"]["video_grabber_key"])

    def test_rejects_missing_or_empty_media(self):
        for suffix in ("mp4", "webp"):
            path = self.store / f"0.{suffix}"
            path.unlink()
            with self.assertRaisesRegex(ValueError, "missing or empty"):
                prepare(self.store, 2)
            path.write_bytes(b"")
            with self.assertRaisesRegex(ValueError, "missing or empty"):
                prepare(self.store, 2)
            path.write_bytes(b"fixture")

    def test_rejects_mismatched_id_invalid_json_and_insufficient_videos(self):
        with self.assertRaisesRegex(ValueError, "more than 3"):
            prepare(self.store, 3)
        self.data["id"] = 7
        self.write(0, self.data)
        with self.assertRaisesRegex(ValueError, "filename must match"):
            prepare(self.store, 2)
        (self.store / "0.json").write_text("{", encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "0.json"):
            prepare(self.store, 2)

    def test_rejects_invalid_metadata_and_unknown_empty_case(self):
        with self.assertRaisesRegex(ValueError, "does not exist"):
            prepare(self.store, 2, 99)
        for field, value in (("duration", -1), ("width", True), ("title", " "), ("title", "x" * 256)):
            with self.subTest(field=field, value=value):
                data = copy.deepcopy(self.data)
                data[field] = value
                self.write(0, data)
                with self.assertRaises(ValueError):
                    prepare(self.store, 2)


if __name__ == "__main__":
    unittest.main()
