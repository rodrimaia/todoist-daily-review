#!/bin/bash

set -u

RALPH_AGENT="codex"
RALPH_LOCK_HELD=0
RALPH_OUTCOME=""

ralph_usage() {
  echo "Usage: $0 [--agent codex|opencode]" >&2
}

ralph_parse_arguments() {
  RALPH_AGENT="codex"
  if [ "$#" -eq 0 ]; then
    return 0
  fi
  if [ "$#" -eq 2 ] && [ "$1" = "--agent" ]; then
    case "$2" in
      codex|opencode) RALPH_AGENT="$2"; return 0 ;;
    esac
  fi
  ralph_usage
  return 2
}

ralph_require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "error: required command not found: $1" >&2
    return 2
  fi
}

ralph_absolute_git_directory() {
  directory="$1"
  case "$directory" in
    /*) ;;
    *) directory="$RALPH_REPO_ROOT/$directory" ;;
  esac
  (cd "$directory" 2>/dev/null && pwd -P)
}

ralph_preflight() {
  ralph_require_command git || return $?
  ralph_require_command gh || return $?
  ralph_require_command sbx || return $?

  RALPH_REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || {
    echo "error: run Ralph inside a Git repository" >&2
    return 2
  }
  RALPH_REPO_ROOT="$(cd "$RALPH_REPO_ROOT" && pwd -P)"
  git_directory="$(git -C "$RALPH_REPO_ROOT" rev-parse --git-dir)" || return 2
  common_directory="$(git -C "$RALPH_REPO_ROOT" rev-parse --git-common-dir)" || return 2
  RALPH_GIT_DIRECTORY="$(ralph_absolute_git_directory "$git_directory")" || return 2
  RALPH_COMMON_DIRECTORY="$(ralph_absolute_git_directory "$common_directory")" || return 2
  if [ "$RALPH_GIT_DIRECTORY" != "$RALPH_COMMON_DIRECTORY" ]; then
    echo "error: Ralph must run from the repository's primary checkout" >&2
    return 2
  fi

  RALPH_DEFAULT_BRANCH="$(gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name')" || {
    echo "error: unable to detect the repository default branch" >&2
    return 2
  }
  if [ -z "$RALPH_DEFAULT_BRANCH" ]; then
    echo "error: repository default branch is empty" >&2
    return 2
  fi
  current_branch="$(git -C "$RALPH_REPO_ROOT" symbolic-ref --quiet --short HEAD)" || {
    echo "error: Ralph requires a checked-out branch" >&2
    return 2
  }
  if [ "$current_branch" != "$RALPH_DEFAULT_BRANCH" ]; then
    echo "error: Ralph requires default branch $RALPH_DEFAULT_BRANCH; current branch is $current_branch" >&2
    return 2
  fi
  dirty="$(git -C "$RALPH_REPO_ROOT" status --porcelain=v1 --untracked-files=all --ignored=no)" || return 2
  if [ -n "$dirty" ]; then
    echo "error: Ralph requires a clean tracked and untracked working tree" >&2
    printf '%s\n' "$dirty" >&2
    return 2
  fi
  RALPH_PROMPT="$RALPH_REPO_ROOT/ralph/work-one.md"
  if [ ! -f "$RALPH_PROMPT" ]; then
    echo "error: missing Ralph prompt: $RALPH_PROMPT" >&2
    return 2
  fi
}

ralph_acquire_lock() {
  RALPH_LOCK_PATH="$RALPH_COMMON_DIRECTORY/ai-workflow-ralph.lock"
  if ! mkdir "$RALPH_LOCK_PATH" 2>/dev/null; then
    echo "error: another Ralph process may own this repository" >&2
    echo "lock: $RALPH_LOCK_PATH" >&2
    if [ -f "$RALPH_LOCK_PATH/owner" ]; then
      sed 's/^/owner: /' "$RALPH_LOCK_PATH/owner" >&2
    fi
    echo "remove this lock directory manually only after confirming no Ralph process is running" >&2
    return 2
  fi
  {
    echo "pid=$$"
    echo "agent=$RALPH_AGENT"
    echo "workspace=$RALPH_REPO_ROOT"
  } > "$RALPH_LOCK_PATH/owner"
  RALPH_LOCK_HELD=1
  trap 'ralph_release_lock' EXIT
  trap 'exit 130' INT
  trap 'exit 143' TERM HUP
}

ralph_release_lock() {
  if [ "$RALPH_LOCK_HELD" -eq 1 ]; then
    rm -rf "$RALPH_LOCK_PATH"
    RALPH_LOCK_HELD=0
  fi
}

ralph_run_agent() {
  if [ "$RALPH_AGENT" = "codex" ]; then
    sbx run codex "$RALPH_REPO_ROOT" -- exec --ephemeral \
      --dangerously-bypass-approvals-and-sandbox - < "$RALPH_PROMPT"
  else
    prompt="$(cat "$RALPH_PROMPT")"
    sbx run opencode "$RALPH_REPO_ROOT" -- run --auto "$prompt"
  fi
}

ralph_parse_outcome() {
  output="$1"
  recognized_count="$(
    printf '%s\n' "$output" \
      | grep -Eo '<promise>(ISSUE_COMPLETE|ISSUE_BLOCKED|QUEUE_EMPTY)</promise>' \
      | wc -l \
      | tr -d ' '
  )"
  terminal_line="$(printf '%s\n' "$output" | awk 'NF { line=$0 } END { print line }')"
  if [ "$recognized_count" != "1" ]; then
    echo "error: agent output must contain exactly one recognized Ralph sigil" >&2
    return 2
  fi
  case "$terminal_line" in
    '<promise>ISSUE_COMPLETE</promise>') RALPH_OUTCOME="ISSUE_COMPLETE" ;;
    '<promise>ISSUE_BLOCKED</promise>') RALPH_OUTCOME="ISSUE_BLOCKED" ;;
    '<promise>QUEUE_EMPTY</promise>') RALPH_OUTCOME="QUEUE_EMPTY" ;;
    *)
      echo "error: recognized Ralph sigil must be the final non-empty output line" >&2
      return 2
      ;;
  esac
}

ralph_run_iteration() {
  ralph_preflight || return $?
  output="$(ralph_run_agent)"
  status=$?
  if [ -n "$output" ]; then
    printf '%s\n' "$output"
  fi
  if [ "$status" -ne 0 ]; then
    echo "error: $RALPH_AGENT agent exited with status $status" >&2
    return "$status"
  fi
  ralph_parse_outcome "$output"
}

ralph_main() {
  ralph_parse_arguments "$@" || return $?
  ralph_preflight || return $?
  ralph_acquire_lock || return $?
  ralph_run_iteration
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  ralph_main "$@"
fi
