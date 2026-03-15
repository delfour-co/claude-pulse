#!/bin/bash
# Claude Pulse — hook script for Claude Code
#
# Called by Claude Code lifecycle hooks with JSON on stdin.
# Writes structured events to ~/.local/share/claude-pulse/events.jsonl
#
# Set CLAUDE_PROFILE env var to tag events (e.g. CLAUDE_PROFILE=perso)

set -euo pipefail

INPUT=$(cat)
EVENT_NAME=$(echo "$INPUT" | jq -r '.hook_event_name')
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
MONITOR_FILE="${XDG_DATA_HOME:-$HOME/.local/share}/claude-pulse/events.jsonl"
PROFILE="${CLAUDE_PROFILE:-default}"

mkdir -p "$(dirname "$MONITOR_FILE")"

case "$EVENT_NAME" in
  SubagentStart)
    jq -nc --argjson input "$INPUT" --arg ts "$TIMESTAMP" --arg profile "$PROFILE" '{
      event: "SubagentStart",
      agent_id: $input.agent_id,
      agent_type: $input.agent_type,
      session_id: $input.session_id,
      cwd: $input.cwd,
      timestamp: $ts,
      profile: $profile
    }' >> "$MONITOR_FILE"
    ;;
  SubagentStop)
    jq -nc --argjson input "$INPUT" --arg ts "$TIMESTAMP" --arg profile "$PROFILE" '{
      event: "SubagentStop",
      agent_id: $input.agent_id,
      agent_type: $input.agent_type,
      session_id: $input.session_id,
      cwd: $input.cwd,
      timestamp: $ts,
      profile: $profile
    }' >> "$MONITOR_FILE"
    ;;
  SessionStart)
    jq -nc --argjson input "$INPUT" --arg ts "$TIMESTAMP" --arg profile "$PROFILE" '{
      event: "SessionStart",
      session_id: $input.session_id,
      cwd: $input.cwd,
      timestamp: $ts,
      model: ($input.model // null),
      profile: $profile
    }' >> "$MONITOR_FILE"
    ;;
  SessionEnd)
    jq -nc --argjson input "$INPUT" --arg ts "$TIMESTAMP" --arg profile "$PROFILE" '{
      event: "SessionEnd",
      session_id: $input.session_id,
      cwd: $input.cwd,
      timestamp: $ts,
      profile: $profile
    }' >> "$MONITOR_FILE"
    ;;
esac

exit 0
