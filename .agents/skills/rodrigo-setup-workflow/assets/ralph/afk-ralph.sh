#!/bin/bash

set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
source "$SCRIPT_DIR/ralph-once.sh"

ralph_afk_main() {
  ralph_parse_arguments "$@" || return $?
  ralph_preflight || return $?
  ralph_acquire_lock || return $?

  iteration=1
  while [ "$iteration" -le 20 ]; do
    echo "Ralph Iteration $iteration/20 ($RALPH_AGENT)"
    ralph_run_iteration || return $?
    case "$RALPH_OUTCOME" in
      QUEUE_EMPTY)
        echo "Execution Frontier is empty after $iteration iteration(s)."
        return 0
        ;;
      ISSUE_COMPLETE|ISSUE_BLOCKED) ;;
      *)
        echo "error: internal Ralph outcome is unavailable" >&2
        return 2
        ;;
    esac
    iteration=$((iteration + 1))
  done

  echo "Ralph Run reached its 20-iteration limit; work may remain."
  return 0
}

ralph_afk_main "$@"
