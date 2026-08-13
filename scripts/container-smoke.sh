#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$ROOT_DIR"

IMAGE=${TODOIST_DAILY_REVIEW_IMAGE:-todoist-daily-review:release-check}
DIRECT_CONTAINER="todoist-review-smoke-$$"
COMPOSE_PROJECT="todoist-review-smoke-$$"
COMPOSE_PORT=${TODOIST_DAILY_REVIEW_SMOKE_PORT:-}
TMP_DIR=$(mktemp -d)
direct_running=false
compose_running=false

cleanup() {
  if [[ "$compose_running" == true ]]; then
    TODOIST_DAILY_REVIEW_IMAGE="$IMAGE" \
      TODOIST_DAILY_REVIEW_PORT="$COMPOSE_PORT" \
      docker compose --project-name "$COMPOSE_PROJECT" down --remove-orphans >/dev/null 2>&1 || true
  fi
  if [[ "$direct_running" == true ]]; then
    docker rm --force "$DIRECT_CONTAINER" >/dev/null 2>&1 || true
  fi
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT INT TERM

for command in docker curl bun; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "Required command not found: $command" >&2
    exit 1
  fi
done

docker info >/dev/null
docker compose version >/dev/null

if [[ ${TODOIST_DAILY_REVIEW_SKIP_BUILD:-false} != true ]]; then
  docker build --tag "$IMAGE" .
fi

wait_for_app() {
  local origin=$1
  local attempt
  for attempt in $(seq 1 60); do
    if curl --fail --silent --show-error \
      --header 'Host: self-hosted.example' \
      --output /dev/null \
      "$origin/"; then
      return
    fi
    sleep 0.25
  done
  echo "Container did not become ready at $origin" >&2
  return 1
}

assert_header() {
  local headers=$1
  local pattern=$2
  local description=$3
  if ! grep -iEq "$pattern" "$headers"; then
    echo "Missing or invalid $description header" >&2
    return 1
  fi
}

smoke_http() {
  local origin=$1
  local prefix=$2
  local root_body="$TMP_DIR/${prefix}-root.html"
  local headers="$TMP_DIR/${prefix}-headers"
  local body="$TMP_DIR/${prefix}-body"
  local route

  curl --fail --silent --show-error \
    --header 'Host: self-hosted.example' \
    --dump-header "$headers" \
    --output "$root_body" \
    "$origin/"

  grep -q '<title>Todoist Daily Review</title>' "$root_body"
  assert_header "$headers" '^content-type: text/html' 'Content-Type'
  assert_header "$headers" '^content-security-policy:.*https://api\.todoist\.com' 'Content-Security-Policy'
  assert_header "$headers" '^permissions-policy:.*camera=\(\)' 'Permissions-Policy'
  assert_header "$headers" '^referrer-policy: no-referrer' 'Referrer-Policy'
  assert_header "$headers" '^x-content-type-options: nosniff' 'X-Content-Type-Options'
  assert_header "$headers" '^x-frame-options: DENY' 'X-Frame-Options'
  if grep -iq 'umami\.rodrigomaia\.me' "$headers"; then
    echo 'Self-hosted CSP permits the maintainer Umami instance' >&2
    return 1
  fi

  for route in / /review /weekly-review /settings; do
    curl --fail --silent --show-error \
      --header 'Host: self-hosted.example' \
      --dump-header "$headers" \
      --output "$body" \
      "$origin$route"
    assert_header "$headers" '^content-type: text/html' "Content-Type for $route"
    if ! cmp -s "$root_body" "$body"; then
      echo "SPA route $route did not return the application entry document" >&2
      return 1
    fi
  done

  local assets="$TMP_DIR/${prefix}-assets"
  grep -Eo '(src|href)="[^"]+\.(js|css)"' "$root_body" \
    | cut -d '"' -f 2 \
    | sort -u > "$assets"
  if [[ ! -s "$assets" ]]; then
    echo 'No JavaScript or CSS assets were found in the built entry document' >&2
    return 1
  fi

  local asset content_type
  while IFS= read -r asset; do
    curl --fail --silent --show-error \
      --header 'Host: self-hosted.example' \
      --dump-header "$headers" \
      --output /dev/null \
      "$origin$asset"
    content_type=$(grep -i '^content-type:' "$headers" | tr -d '\r' | tail -1)
    case "$asset" in
      *.css)
        [[ "$content_type" == *'text/css'* ]] || {
          echo "CSS asset has the wrong Content-Type: $asset ($content_type)" >&2
          return 1
        }
        ;;
      *.js)
        [[ "$content_type" == *'javascript'* ]] || {
          echo "JavaScript asset has the wrong Content-Type: $asset ($content_type)" >&2
          return 1
        }
        ;;
    esac
  done < "$assets"

  local missing_status
  missing_status=$(curl --silent --show-error \
    --header 'Host: self-hosted.example' \
    --output "$body" \
    --write-out '%{http_code}' \
    "$origin/assets/release-smoke-missing.js")
  if [[ "$missing_status" != 404 ]] || grep -iq '<!doctype html' "$body"; then
    echo 'A missing static asset did not return a non-HTML 404' >&2
    return 1
  fi
}

echo "Starting direct Docker container from $IMAGE"
docker run --detach --rm \
  --name "$DIRECT_CONTAINER" \
  --publish 127.0.0.1::3000 \
  "$IMAGE" >/dev/null
direct_running=true

DIRECT_BINDING=$(docker port "$DIRECT_CONTAINER" 3000/tcp | head -1)
DIRECT_PORT=${DIRECT_BINDING##*:}
DIRECT_ORIGIN="http://127.0.0.1:$DIRECT_PORT"
wait_for_app "$DIRECT_ORIGIN"
smoke_http "$DIRECT_ORIGIN" direct
BROWSER_CHECK_ORIGIN="$DIRECT_ORIGIN" bun scripts/browser-check.ts

docker rm --force "$DIRECT_CONTAINER" >/dev/null
direct_running=false
COMPOSE_PORT=${COMPOSE_PORT:-$DIRECT_PORT}

echo 'Starting the committed Docker Compose service'
TODOIST_DAILY_REVIEW_IMAGE="$IMAGE" \
  TODOIST_DAILY_REVIEW_PORT="$COMPOSE_PORT" \
  docker compose --project-name "$COMPOSE_PROJECT" up --detach
compose_running=true
COMPOSE_ORIGIN="http://127.0.0.1:$COMPOSE_PORT"
wait_for_app "$COMPOSE_ORIGIN"
smoke_http "$COMPOSE_ORIGIN" compose

TODOIST_DAILY_REVIEW_IMAGE="$IMAGE" \
  TODOIST_DAILY_REVIEW_PORT="$COMPOSE_PORT" \
  docker compose --project-name "$COMPOSE_PROJECT" down --remove-orphans >/dev/null
compose_running=false

echo 'Docker, Compose, SPA route, asset, security header, and browser smoke checks passed'
