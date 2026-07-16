#!/usr/bin/env python3
"""Upsert the canonical AI Workflow Pack block in the root AGENTS.md."""

from __future__ import annotations

import os
from pathlib import Path
import sys
import tempfile


START = "<!-- ai-workflow:start -->"
END = "<!-- ai-workflow:end -->"
BLOCK = """<!-- ai-workflow:start -->
## AI workflow

- For any requested software change, invoke `rodrigo-propose-change` before implementation.
- Treat `openspec/specs/` as the source of truth and modify it only through approved OpenSpec changes.
- Do not implement changes before their OpenSpec approval.
- When asked to continue existing approved work, invoke `rodrigo-run-queue`.
<!-- ai-workflow:end -->"""


class MarkerError(ValueError):
    """Raised when ownership markers are ambiguous or malformed."""


def upsert(content: str) -> tuple[str, str]:
    """Return updated content and the performed action without touching the file."""
    starts = content.count(START)
    ends = content.count(END)

    if starts == 0 and ends == 0:
        if not content:
            return BLOCK + "\n", "created"
        separator = "\n" if content.endswith("\n") else "\n\n"
        return content + separator + BLOCK + "\n", "appended"

    if starts != 1 or ends != 1:
        raise MarkerError(
            "AGENTS.md must contain either no workflow markers or exactly one marker pair"
        )

    start = content.index(START)
    end = content.index(END)
    if end < start:
        raise MarkerError("the workflow end marker appears before the start marker")

    end += len(END)
    return content[:start] + BLOCK + content[end:], "replaced"


def atomic_write(path: Path, content: str) -> None:
    """Replace path atomically while retaining an existing file's permissions."""
    mode = path.stat().st_mode if path.exists() else None
    descriptor, temporary_name = tempfile.mkstemp(
        dir=path.parent, prefix=f".{path.name}.", text=True
    )
    temporary = Path(temporary_name)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8", newline="") as handle:
            handle.write(content)
        if mode is not None:
            os.chmod(temporary, mode)
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


def main() -> int:
    path = Path.cwd() / "AGENTS.md"
    original = path.read_text(encoding="utf-8") if path.exists() else ""
    try:
        updated, action = upsert(original)
    except MarkerError as error:
        print(f"error: {error}", file=sys.stderr)
        return 2

    if updated != original:
        atomic_write(path, updated)
    print(f"AI Workflow Pack routing block {action}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
