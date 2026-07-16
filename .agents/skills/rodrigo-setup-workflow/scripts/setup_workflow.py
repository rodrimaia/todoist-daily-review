#!/usr/bin/env python3
"""Preflight and validate AI Workflow Pack setup without staging or committing."""

from __future__ import annotations

import argparse
from pathlib import Path
import re
import subprocess
import sys


SKILLS = ("rodrigo-propose-change", "rodrigo-setup-workflow")
OPENSPEC_SKILLS = (
    "openspec-apply-change",
    "openspec-archive-change",
    "openspec-explore",
    "openspec-propose",
)
OPENCODE_COMMANDS = (
    "opsx-apply.md",
    "opsx-archive.md",
    "opsx-explore.md",
    "opsx-propose.md",
)
PROTECTED_PATHS = (
    "AGENTS.md",
    "openspec/config.yaml",
) + tuple(
    f".codex/skills/{skill}" for skill in OPENSPEC_SKILLS
) + tuple(
    f".opencode/skills/{skill}" for skill in OPENSPEC_SKILLS
) + tuple(f".opencode/commands/{command}" for command in OPENCODE_COMMANDS)


class SetupError(RuntimeError):
    """Raised when workflow setup cannot continue safely."""


def git(root: Path, *arguments: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["git", *arguments], cwd=root, text=True, capture_output=True
    )


def require_repository() -> tuple[Path, str]:
    probe = git(Path.cwd(), "rev-parse", "--show-toplevel")
    if probe.returncode != 0:
        raise SetupError("run workflow setup inside a Git repository")
    root = Path(probe.stdout.strip()).resolve()
    branch = git(root, "symbolic-ref", "--quiet", "--short", "HEAD")
    if branch.returncode != 0 or not branch.stdout.strip():
        raise SetupError("workflow setup requires a checked-out Git branch")
    return root, branch.stdout.strip()


def require_protected_paths_clean(root: Path) -> None:
    result = git(
        root,
        "status",
        "--porcelain=v1",
        "-z",
        "--untracked-files=all",
        "--",
        *PROTECTED_PATHS,
    )
    if result.returncode != 0:
        raise SetupError(result.stderr.strip() or "unable to inspect setup-managed paths")
    if result.stdout:
        paths = sorted(
            entry[3:] for entry in result.stdout.split("\0") if len(entry) >= 4
        )
        raise SetupError(
            "setup-managed paths already contain local changes: " + ", ".join(paths)
        )


def validate_skill(path: Path, expected_name: str) -> None:
    skill_file = path / "SKILL.md"
    if not skill_file.is_file():
        raise SetupError(f"installed skill is missing {skill_file}")
    content = skill_file.read_text(encoding="utf-8")
    frontmatter = re.match(r"\A---\n(.*?)\n---\n", content, re.DOTALL)
    if not frontmatter:
        raise SetupError(f"{skill_file} has invalid YAML frontmatter")
    fields: dict[str, str] = {}
    for line in frontmatter.group(1).splitlines():
        if ":" in line:
            key, value = line.split(":", 1)
            fields[key.strip()] = value.strip()
    if fields.get("name") != expected_name or not fields.get("description"):
        raise SetupError(
            f"{skill_file} must declare name {expected_name!r} and a description"
        )


def validate_installed_skills(root: Path) -> None:
    skills_root = root / ".agents" / "skills"
    for skill in SKILLS:
        validate_skill(skills_root / skill, skill)
    caches = sorted(
        path.relative_to(root).as_posix()
        for path in skills_root.rglob("*")
        if path.name == "__pycache__" or path.suffix == ".pyc"
    )
    if caches:
        raise SetupError(
            "installed skills contain Python cache artifacts: " + ", ".join(caches)
        )


def preflight() -> None:
    root, branch = require_repository()
    require_protected_paths_clean(root)
    print(f"Workflow setup preflight passed on branch {branch}")


def validate() -> None:
    root, branch = require_repository()
    validate_installed_skills(root)
    print(f"AI Workflow Pack setup validated on {branch}; changes remain uncommitted")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=("preflight", "validate"))
    arguments = parser.parse_args()
    try:
        if arguments.action == "preflight":
            preflight()
        else:
            validate()
    except SetupError as error:
        print(f"error: {error}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
