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
