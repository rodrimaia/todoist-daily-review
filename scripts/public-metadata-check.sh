#!/usr/bin/env bash
set -euo pipefail

REPOSITORY=${1:-${GITHUB_REPOSITORY:-rodrimaia/todoist-daily-review}}
OWNER=${REPOSITORY%%/*}
NAME=${REPOSITORY#*/}

if [[ -z "$OWNER" || -z "$NAME" || "$OWNER" == "$NAME" ]]; then
  echo 'Usage: scripts/public-metadata-check.sh owner/repository' >&2
  exit 1
fi

for command in gh gitleaks; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "Required command not found: $command" >&2
    exit 1
  fi
done

TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT INT TERM
METADATA_FILE="$TMP_DIR/github-public-metadata.json"

read -r -d '' QUERY <<'GRAPHQL' || true
query PublicMetadata($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) {
    nameWithOwner
    description
    homepageUrl
    visibility
    issues(first: 100, orderBy: {field: CREATED_AT, direction: ASC}) {
      nodes {
        number
        title
        body
        url
        comments(first: 100) {
          nodes { body url author { login } }
          pageInfo { hasNextPage }
        }
      }
      pageInfo { hasNextPage }
    }
    pullRequests(first: 100, orderBy: {field: CREATED_AT, direction: ASC}) {
      nodes {
        number
        title
        body
        url
        comments(first: 100) {
          nodes { body url author { login } }
          pageInfo { hasNextPage }
        }
        reviews(first: 100) {
          nodes { body url author { login } }
          pageInfo { hasNextPage }
        }
        reviewThreads(first: 20) {
          nodes {
            comments(first: 20) {
              nodes { body url author { login } }
              pageInfo { hasNextPage }
            }
          }
          pageInfo { hasNextPage }
        }
      }
      pageInfo { hasNextPage }
    }
    releases(first: 100, orderBy: {field: CREATED_AT, direction: ASC}) {
      nodes { name tagName description url }
      pageInfo { hasNextPage }
    }
  }
}
GRAPHQL

gh api graphql \
  --field owner="$OWNER" \
  --field name="$NAME" \
  --field query="$QUERY" > "$METADATA_FILE"

if [[ -n ${PUBLIC_METADATA_OUTPUT:-} ]]; then
  mkdir -p "$(dirname "$PUBLIC_METADATA_OUTPUT")"
  cp "$METADATA_FILE" "$PUBLIC_METADATA_OUTPUT"
fi

gitleaks dir "$TMP_DIR" --redact --no-banner

if grep -Fq '"hasNextPage":true' "$METADATA_FILE"; then
  echo 'GitHub metadata exceeds the audited query limits; expand or paginate the export' >&2
  exit 1
fi

if grep -Eiq \
  '(/Users/[^/" ]+|/home/[^/" ]+|/var/folders/|[A-Z]:\\Users\\)' \
  "$METADATA_FILE"; then
  echo 'GitHub public metadata contains an unintended local filesystem path' >&2
  exit 1
fi

if [[ -n ${PUBLIC_METADATA_OUTPUT:-} ]]; then
  echo "Metadata saved for human privacy review: $PUBLIC_METADATA_OUTPUT"
else
  echo 'GitHub metadata secret and local-path checks passed; complete the human privacy review before release'
fi
