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
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')
BRANCH=$(git -C "$CWD" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")

mkdir -p "$(dirname "$MONITOR_FILE")"

case "$EVENT_NAME" in

  SessionStart)
    jq -nc --argjson i "$INPUT" --arg ts "$TIMESTAMP" --arg p "$PROFILE" --arg b "$BRANCH" '{
      event:"SessionStart", session_id:$i.session_id, cwd:$i.cwd,
      timestamp:$ts, model:($i.model//null), profile:$p, branch:$b
    }' >> "$MONITOR_FILE" ;;
  SessionEnd)
    jq -nc --argjson i "$INPUT" --arg ts "$TIMESTAMP" --arg p "$PROFILE" '{
      event:"SessionEnd", session_id:$i.session_id, cwd:$i.cwd,
      timestamp:$ts, reason:($i.reason//null), profile:$p
    }' >> "$MONITOR_FILE" ;;

  SubagentStart)
    jq -nc --argjson i "$INPUT" --arg ts "$TIMESTAMP" --arg p "$PROFILE" --arg b "$BRANCH" '{
      event:"SubagentStart", agent_id:$i.agent_id, agent_type:$i.agent_type,
      session_id:$i.session_id, cwd:$i.cwd, timestamp:$ts, profile:$p, branch:$b
    }' >> "$MONITOR_FILE" ;;
  SubagentStop)
    jq -nc --argjson i "$INPUT" --arg ts "$TIMESTAMP" --arg p "$PROFILE" '{
      event:"SubagentStop", agent_id:$i.agent_id, agent_type:$i.agent_type,
      session_id:$i.session_id, cwd:$i.cwd, timestamp:$ts, profile:$p,
      summary:($i.last_assistant_message//null | if . then (.[0:120] | gsub("\n";" ")) else null end)
    }' >> "$MONITOR_FILE" ;;

  PreToolUse)
    jq -nc --argjson i "$INPUT" --arg ts "$TIMESTAMP" --arg p "$PROFILE" '{
      event:"ToolUse", session_id:$i.session_id, cwd:$i.cwd,
      timestamp:$ts, profile:$p,
      tool_name:$i.tool_name, tool_use_id:$i.tool_use_id
    }' >> "$MONITOR_FILE" ;;
  PostToolUseFailure)
    jq -nc --argjson i "$INPUT" --arg ts "$TIMESTAMP" --arg p "$PROFILE" '{
      event:"ToolError", session_id:$i.session_id, cwd:$i.cwd,
      timestamp:$ts, profile:$p,
      tool_name:$i.tool_name, tool_use_id:$i.tool_use_id,
      error:($i.error//null | if . then (.[0:200] | gsub("\n";" ")) else null end),
      is_interrupt:($i.is_interrupt//false)
    }' >> "$MONITOR_FILE" ;;

  PreCompact)
    # Compute context usage from transcript if available
    TRANSCRIPT_PATH=$(echo "$INPUT" | jq -r '.transcript_path // empty')
    CTX_TOKENS=0
    if [ -n "$TRANSCRIPT_PATH" ] && [ -f "$TRANSCRIPT_PATH" ]; then
      CTX_TOKENS=$(grep -o '"cache_read_input_tokens":[0-9]*' "$TRANSCRIPT_PATH" 2>/dev/null | tail -1 | grep -o '[0-9]*' || echo "0")
    fi
    jq -nc --argjson i "$INPUT" --arg ts "$TIMESTAMP" --arg p "$PROFILE" --argjson ctx "$CTX_TOKENS" '{
      event:"Compact", session_id:$i.session_id, cwd:$i.cwd,
      timestamp:$ts, profile:$p, trigger:($i.trigger//null), context_tokens:$ctx
    }' >> "$MONITOR_FILE" ;;

  TaskCompleted)
    jq -nc --argjson i "$INPUT" --arg ts "$TIMESTAMP" --arg p "$PROFILE" '{
      event:"TaskDone", session_id:$i.session_id, cwd:$i.cwd,
      timestamp:$ts, profile:$p,
      task_id:($i.task_id//null),
      task_subject:($i.task_subject//null | if . then .[0:100] else null end)
    }' >> "$MONITOR_FILE" ;;

  WorktreeCreate)
    jq -nc --argjson i "$INPUT" --arg ts "$TIMESTAMP" --arg p "$PROFILE" '{
      event:"WorktreeCreate", session_id:$i.session_id, cwd:$i.cwd,
      timestamp:$ts, profile:$p, name:($i.name//null)
    }' >> "$MONITOR_FILE" ;;
  WorktreeRemove)
    jq -nc --argjson i "$INPUT" --arg ts "$TIMESTAMP" --arg p "$PROFILE" '{
      event:"WorktreeRemove", session_id:$i.session_id, cwd:$i.cwd,
      timestamp:$ts, profile:$p, worktree_path:($i.worktree_path//null)
    }' >> "$MONITOR_FILE" ;;

  UserPromptSubmit)
    jq -nc --argjson i "$INPUT" --arg ts "$TIMESTAMP" --arg p "$PROFILE" '{
      event:"Prompt", session_id:$i.session_id, cwd:$i.cwd,
      timestamp:$ts, profile:$p
    }' >> "$MONITOR_FILE" ;;

  Notification)
    jq -nc --argjson i "$INPUT" --arg ts "$TIMESTAMP" --arg p "$PROFILE" '{
      event:"Notification", session_id:$i.session_id, cwd:$i.cwd,
      timestamp:$ts, profile:$p,
      message:($i.message//null | if . then .[0:200] else null end),
      title:($i.title//null),
      notification_type:($i.notification_type//null)
    }' >> "$MONITOR_FILE" ;;

  Stop)
    jq -nc --argjson i "$INPUT" --arg ts "$TIMESTAMP" --arg p "$PROFILE" '{
      event:"Stop", session_id:$i.session_id, cwd:$i.cwd,
      timestamp:$ts, profile:$p
    }' >> "$MONITOR_FILE"
    # Compute and emit cost event from transcript
    TRANSCRIPT_PATH=$(echo "$INPUT" | jq -r '.transcript_path // empty')
    MODEL=$(echo "$INPUT" | jq -r '.model // empty')
    if [ -n "$TRANSCRIPT_PATH" ] && [ -f "$TRANSCRIPT_PATH" ]; then
      HOOK_DIR="$(dirname "$(readlink -f "$0")")"
      COST_SCRIPT="$HOOK_DIR/compute-cost.sh"
      if [ -f "$COST_SCRIPT" ]; then
        COST_DATA=$(bash "$COST_SCRIPT" "$TRANSCRIPT_PATH" "$MODEL" 2>/dev/null || echo '{}')
        SESSION_ID=$(echo "$INPUT" | jq -r '.session_id')
        jq -nc --argjson c "$COST_DATA" --arg sid "$SESSION_ID" --arg ts "$TIMESTAMP" --arg p "$PROFILE" --arg cwd "$(echo "$INPUT" | jq -r '.cwd')" '{
          event:"Cost", session_id:$sid, cwd:$cwd, timestamp:$ts, profile:$p,
          cost_usd:$c.cost_usd, tokens:$c.tokens,
          input:$c.input, output:$c.output,
          cache_read:$c.cache_read, cache_create:$c.cache_create
        }' >> "$MONITOR_FILE"
      fi
    fi ;;

esac

exit 0
