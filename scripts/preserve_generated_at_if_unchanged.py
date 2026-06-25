#!/usr/bin/env python3
"""Avoid catalog update PRs when only generatedAtUtc changed."""

from __future__ import annotations

import copy
import json
import pathlib
import subprocess
import sys


def load_head_json(path: str) -> dict[str, object] | None:
    result = subprocess.run(
        ["git", "show", f"HEAD:{path}"],
        check=False,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    if result.returncode != 0:
        return None
    return json.loads(result.stdout)


def without_generated_at(payload: dict[str, object]) -> dict[str, object]:
    clone = copy.deepcopy(payload)
    meta = clone.get("meta")
    if isinstance(meta, dict):
        meta.pop("generatedAtUtc", None)
    return clone


def write_compact(path: pathlib.Path, payload: dict[str, object]) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def preserve_if_unchanged(path: pathlib.Path) -> None:
    current = json.loads(path.read_text(encoding="utf-8"))
    previous = load_head_json(path.as_posix())
    if previous is None:
        return
    if without_generated_at(current) != without_generated_at(previous):
        return

    current_meta = current.get("meta")
    previous_meta = previous.get("meta")
    if isinstance(current_meta, dict) and isinstance(previous_meta, dict):
        current_meta["generatedAtUtc"] = previous_meta.get("generatedAtUtc")
        write_compact(path, current)
        print(f"{path}: preserved generatedAtUtc because catalog content is unchanged")


def main() -> int:
    for raw_path in sys.argv[1:]:
        preserve_if_unchanged(pathlib.Path(raw_path))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
