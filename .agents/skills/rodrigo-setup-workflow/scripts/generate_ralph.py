#!/usr/bin/env python3
"""Generate the canonical repository-root Ralph execution files."""

from __future__ import annotations

import os
from pathlib import Path
import shutil
import sys
import tempfile


FILES = {
    "ralph-once.sh": 0o755,
    "afk-ralph.sh": 0o755,
    "work-one.md": 0o644,
}


def atomic_copy(source: Path, destination: Path, mode: int) -> None:
    descriptor, temporary_name = tempfile.mkstemp(
        dir=destination.parent, prefix=f".{destination.name}."
    )
    temporary = Path(temporary_name)
    try:
        with source.open("rb") as reader, os.fdopen(descriptor, "wb") as writer:
            shutil.copyfileobj(reader, writer)
        os.chmod(temporary, mode)
        os.replace(temporary, destination)
    finally:
        temporary.unlink(missing_ok=True)


def main() -> int:
    root = Path.cwd()
    assets = Path(__file__).resolve().parents[1] / "assets" / "ralph"
    destination = root / "ralph"
    destination.mkdir(parents=True, exist_ok=True)
    for name, mode in FILES.items():
        source = assets / name
        if not source.is_file():
            print(f"error: missing bundled Ralph asset {source}", file=sys.stderr)
            return 2
        atomic_copy(source, destination / name, mode)
    for name, mode in FILES.items():
        source = assets / name
        generated = destination / name
        if source.read_bytes() != generated.read_bytes():
            print(f"error: generated Ralph file differs: {generated}", file=sys.stderr)
            return 2
        if generated.stat().st_mode & 0o777 != mode:
            print(f"error: generated Ralph mode differs: {generated}", file=sys.stderr)
            return 2
    print("Generated canonical Ralph files in ralph/")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
