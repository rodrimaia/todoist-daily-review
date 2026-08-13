# Maintainer release gate

A public release is an operational action, not just a Git tag. Complete this
gate from a clean checkout of the commit being released. Never copy a real
Todoist token, task, project, filter, screenshot, or browser-storage export into
logs or release evidence.

## 1. Validate the candidate

Run every command in the README's [Validation](../README.md#validation)
section. The GitHub workflow repeats the same gate before it publishes a GHCR
tag. Do not continue after a warning that has not been understood and accepted.

Record only command names, pass/fail status, commit SHA, image digest, and UTC
time. Do not record browser request headers or response bodies from Todoist.

## 2. Audit public material

1. Run the full-history Gitleaks command from the README.
2. Export and scan GitHub-visible issue, pull-request, review, comment, and
   release text, then inspect the export manually:

   ```bash
   PUBLIC_METADATA_OUTPUT=/tmp/todoist-daily-review-public-metadata.json \
     bun run check:public-metadata
   ```

   Delete the export after review. The automated check catches secrets and
   local filesystem paths; a human must still look for Todoist content,
   unnecessary biographical details, private infrastructure, and screenshots.
3. Inspect `git ls-files` and the public commit list. Confirm that tracked files
   contain no environment files, browser profiles, generated evidence, real
   account identifiers, or personal Todoist content. The maintainer's name,
   project domain, Hosted Umami origin, and public Umami website ID are
   intentional project metadata, not credentials.

### Dispose of PR #10

PR #10 is superseded. Its useful recurring-task, cache, identity, route-guard,
and read-error hardening is covered by the delivered code and focused tests,
including the work landed through #20. Replace its generated body with a short
human-readable disposition before closing it. A suitable body is:

> ## Disposition
>
> Superseded by the hardening delivered through #20 and the subsequent public-
> release work. The useful recurring-task, Todoist identity/cache, route-guard,
> and visible read-error changes are present on `master` with focused tests.
> Nothing from this branch remains to merge, so this PR is closed as redundant.

Remove generated pipeline prose, private machine paths, and obsolete evidence
links. Then close the PR without merging it.

## 3. Verify both deployment paths

### Self-hosted

From a machine or profile that has no GHCR login:

1. Follow the README's `docker pull`/`docker run` instructions exactly.
2. Follow the committed Docker Compose instructions exactly.
3. Open `/`, `/review`, `/weekly-review`, and `/settings` directly and through
   in-app navigation. Confirm static assets are not replaced by the SPA fallback.
4. In a fresh browser profile, confirm the onboarding identifies the copy as
   Self-hosted and the Network panel never requests
   `umami.rodrigomaia.me`, even if old consent-like local storage is present.

Use an isolated Docker configuration to prove the documented image is
anonymously pullable without changing the maintainer's login:

```bash
anonymous_config=$(mktemp -d)
DOCKER_CONFIG="$anonymous_config" docker pull \
  ghcr.io/rodrimaia/todoist-daily-review:latest
rm -rf "$anonymous_config"
```

### Hosted

Deploy the exact validated commit/image, then use a fresh browser profile and a
maintainer-controlled test Todoist account. Do not automate or record its token.
Verify:

- the no-token page gives friendly onboarding and official token guidance;
- a temporary token survives reload in its tab but is absent from a new tab
  session;
- a remembered token survives a new browser session, can be changed back to
  temporary, and can be cleared;
- declining consent makes no Umami request; accepting sends only fixed-route
  pageviews; withdrawing in Settings stops future requests immediately;
- Home, Daily Review, Weekly Review, and Settings navigation works against real
  Todoist reads, and at least one safe review decision is reflected in Todoist;
- direct requests to all four routes serve the app and the deployed commit
  matches the candidate.

Revoke the test token after verification if it is no longer needed.

## 4. Make the project discoverable

Before creating the release:

- make the repository public and confirm Issues are enabled and pull requests
  can be opened;
- give the repository a concise description and Hosted URL;
- make the `ghcr.io/rodrimaia/todoist-daily-review` package public;
- repeat the anonymous image pull above;
- read the README while signed out and confirm Hosted and Self-hosted are both
  usable without undocumented setup, and that personal/best-effort support is
  clear.

These are GitHub/hosting control-plane changes and must be performed by the
maintainer or release automation with explicit authority.

## 5. Publish last

Push the chosen semantic version tag only after every item above passes. The
`Validate and publish` workflow reruns the release gate and publishes the
matching versioned GHCR tag. Wait for that workflow and the Hosted deployment
to succeed, repeat the anonymous checks, and only then create the GitHub release
from that tag with concise visitor-facing notes.

If any post-publish check fails, do not move or reuse the tag. Fix forward with
a new candidate and clearly mark the failed release as withdrawn.
