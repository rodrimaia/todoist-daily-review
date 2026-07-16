---
name: rodrigo-setup-workflow
description: Initialize and validate the project-local AI Workflow Pack and generated Ralph runner. Use after installing the pack or when OpenSpec guidance, AGENTS.md routing, or ralph/ files need refreshing.
---

# Set up the workflow

Run this procedure from the target repository root. It leaves every change unstaged and uncommitted for review. It never creates or switches branches, commits, pushes, opens a pull request, waits for checks, or merges.

## Procedure

1. Resolve `openspec` with `command -v openspec` and `git` with `command -v git`.
   - If either executable is unavailable, stop without changing any file.
   - For a missing OpenSpec executable, report the official installation command: `npm install -g @fission-ai/openspec@latest`.
   - For a missing Git executable, report that Git is required for repository setup.
2. Run `python3 .agents/skills/rodrigo-setup-workflow/scripts/setup_workflow.py preflight` from the repository root.
   - If the installed skill is available at another project-local path, invoke the same bundled script from that path.
   - Stop on a detached HEAD or pre-existing local changes to `AGENTS.md` or supported OpenSpec integration paths.
   - Unrelated staged or unstaged changes and changes produced by the preceding Workflow Pack installation may remain.
3. Inspect only whether `openspec/` exists.
   - If absent, run `openspec init --tools codex,opencode`.
   - If present, run `openspec update`. Do not pass profile or tool arguments; preserve the existing OpenSpec configuration.
4. If the OpenSpec command fails or is interrupted, stop immediately. Do not write Workflow Pack guidance.
5. After OpenSpec succeeds, run `python3 .agents/skills/rodrigo-setup-workflow/scripts/upsert_agents.py` from the repository root.
   - If the installed skill is available at another project-local path, invoke the same bundled script from that path.
   - Do not copy, reimplement, or manually edit the managed block.
6. If the upsert script reports malformed or duplicate markers, stop and report the error. Do not guess which content is owned by the workflow.
7. Run `python3 .agents/skills/rodrigo-setup-workflow/scripts/generate_ralph.py` from the repository root. This atomically overwrites the three canonical files under `ralph/` and makes both scripts executable.
8. Run `python3 .agents/skills/rodrigo-setup-workflow/scripts/setup_workflow.py validate` from the repository root. Stop if either installed skill or generated output is invalid. Do not stage or commit any file.

## Completion

Complete only when all of these conditions hold:

- the original OpenSpec command completed successfully;
- the repository-root `AGENTS.md` contains exactly one canonical block delimited by `<!-- ai-workflow:start -->` and `<!-- ai-workflow:end -->`;
- content outside the managed block is unchanged;
- OpenSpec-owned files and the Workflow Pack block coexist;
- exactly two Workflow Pack skills and the three canonical `ralph/` files are present;
- all changes remain unstaged and uncommitted;
- the current branch is unchanged and no remote Git operation occurred.

Report whether OpenSpec was initialized or updated, whether the routing block was created, appended, or replaced, and that the generated changes remain for review.
