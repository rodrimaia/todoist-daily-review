---
name: rodrigo-setup-workflow
description: Initialize or refresh the project-local AI Workflow Pack. Use after installing the pack, when OpenSpec-managed guidance needs refreshing, or when the repository-root AGENTS.md routing block must be installed or repaired.
---

# Set up the workflow

Run this procedure from the target repository root. Do not modify the repository until the prerequisite check succeeds.

## Procedure

1. Resolve `openspec` with `command -v openspec`.
   - If it is unavailable, stop without changing any file.
   - Report the official installation command: `npm install -g @fission-ai/openspec@latest`.
2. Inspect only whether `openspec/` exists.
   - If absent, run `openspec init --tools codex,opencode`.
   - If present, run `openspec update`. Do not pass profile or tool arguments; preserve the existing OpenSpec configuration.
3. If the OpenSpec command fails or is interrupted, stop immediately. Do not write Workflow Pack guidance.
4. After OpenSpec succeeds, run `python3 .agents/skills/rodrigo-setup-workflow/scripts/upsert_agents.py` from the repository root.
   - If the installed skill is available at another project-local path, invoke the same bundled script from that path.
   - Do not copy, reimplement, or manually edit the managed block.
5. If the upsert script reports malformed or duplicate markers, stop and report the error. Do not guess which content is owned by the workflow.

## Completion

Complete only when all of these conditions hold:

- the original OpenSpec command completed successfully;
- the repository-root `AGENTS.md` contains exactly one canonical block delimited by `<!-- ai-workflow:start -->` and `<!-- ai-workflow:end -->`;
- content outside the managed block is unchanged;
- OpenSpec-owned files and the Workflow Pack block coexist.

Report whether OpenSpec was initialized or updated and whether the routing block was created, appended, or replaced.
