# Project agent memory

This file is the project's committed home for project-intrinsic agent knowledge: build, test, release, architecture, and sharp-edge notes that should travel with the code.

- Run the local validation commands documented in `README.md` before committing product changes.
- Preserve the review invariants and terminology documented in `CONTEXT.md`; shared decision eligibility lives in `src/lib/task-decisions.ts`.
- Keep Todoist cache and account-identity policy centralized in `src/lib/todoist-cache.ts` and `src/lib/todoist-session.ts`; query keys must never contain token values.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
