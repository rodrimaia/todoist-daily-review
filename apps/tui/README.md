# Terminal client

The Terminal client is introduced incrementally. The shell and packaging
spike are tracked in issue #39 and are intentionally not advertised by the
Web application until Daily and Weekly parity is complete.

## Configuration

The terminal client accepts `--config PATH` and reads a small TOML file. The
default path is `~/.config/todoist-review/config.toml`:

```toml
[todoist]
token = "YOUR_TODOIST_API_TOKEN"
```

Credentials are resolved from `TODOIST_API_TOKEN` before the config file. The
interactive onboarding helper can write owner-only (`0600`) config files; do
not commit them.

## Daily Review project flow

During Inbox review, press `m` to move the current task to a project. Type to
filter project names, use `↑`/`↓` to highlight a result, and press `Enter` to
select it. If there is no match, `Enter` creates the typed project. For
non-recurring tasks, the next screen offers `k` to keep the date, `1`–`4` for
quick dates, or `0` to remove it. Press `Esc` to cancel either step.

Press `r` on any current task to rename it in place. Press `Enter` to save or
`Esc` to cancel; an empty title is rejected without advancing the review.
