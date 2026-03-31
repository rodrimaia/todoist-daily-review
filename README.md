# Todoist Daily Review

A fast, fluid web app for GTD daily reviews on top of Todoist. Process your inbox and review next actions - one task at a time, with quick actions and keyboard shortcuts.

Complete a full daily review in ~2 minutes.

## Features

- **Inbox processing** - move to project, schedule, complete, delete, someday/maybe
- **Filter review** - reschedule, complete, remove date for next actions
- **Keyboard shortcuts** - `1-4` for dates, `c` complete, `d` delete, `s` skip, `m` move
- **Progress tracking** - see how far along you are in the review
- **Summary stats** - breakdown of actions taken at the end

## Setup

```bash
bun install
bun run dev
```

Open http://localhost:3000 and enter your [Todoist API token](https://todoist.com/help/articles/find-your-api-token-Jpzx9IIlB).

### Settings

- **Filter query** - Todoist filter for which tasks to review (default: `@next_action & (no date | overdue | today)`)
- **Someday/Maybe project** - project to move deferred tasks to

## Docker

```bash
docker build -t todoist-daily-review .
docker run -p 3000:3000 todoist-daily-review
```

Or pull from GHCR:

```bash
docker pull ghcr.io/rodrimaia/todoist-daily-review:latest
docker run -p 3000:3000 ghcr.io/rodrimaia/todoist-daily-review:latest
```

## Tech Stack

- React + TanStack Router + TanStack Query
- Tailwind CSS + shadcn/ui
- Todoist API via `@doist/todoist-api-typescript`
- Bun runtime

## License

MIT
