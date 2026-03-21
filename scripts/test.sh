#!/bin/bash
set -euo pipefail

MONITOR_FILE="${XDG_DATA_HOME:-$HOME/.local/share}/claude-pulse/events.jsonl"
mkdir -p "$(dirname "$MONITOR_FILE")"

echo "=== Claude Pulse v3.0 — Full Test ==="
echo ""
echo "Simulating all event types including cost and context health."
echo "Events file: $MONITOR_FILE"
echo ""

TS() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }
SID_PRO="sess-test-pro-001"
SID_PERSO="sess-test-perso-001"

# Sessions with branch
echo "[01/20] Starting session (pro, branch: main)..."
echo '{"event":"SessionStart","session_id":"'"$SID_PRO"'","cwd":"/home/user/work-project","timestamp":"'"$(TS)"'","model":"claude-sonnet-4-6","profile":"pro","branch":"main"}' >> "$MONITOR_FILE"
sleep 0.3
echo "[02/20] Starting session (perso, branch: feat/dashboard)..."
echo '{"event":"SessionStart","session_id":"'"$SID_PERSO"'","cwd":"/home/user/side-project","timestamp":"'"$(TS)"'","model":"claude-opus-4-6","profile":"perso","branch":"feat/dashboard"}' >> "$MONITOR_FILE"
sleep 0.3

# Prompts
echo "[03/20] User prompts..."
echo '{"event":"Prompt","session_id":"'"$SID_PRO"'","cwd":"/home/user/work-project","timestamp":"'"$(TS)"'","profile":"pro"}' >> "$MONITOR_FILE"
echo '{"event":"Prompt","session_id":"'"$SID_PERSO"'","cwd":"/home/user/side-project","timestamp":"'"$(TS)"'","profile":"perso"}' >> "$MONITOR_FILE"
sleep 0.3

# Tool usage
echo "[04/20] Tool calls (pro)..."
for tool in Bash Read Read Edit Write Bash Bash Read Grep Glob Bash Bash; do
    echo '{"event":"ToolUse","session_id":"'"$SID_PRO"'","cwd":"/home/user/work-project","timestamp":"'"$(TS)"'","profile":"pro","tool_name":"'"$tool"'","tool_use_id":"tu-'$RANDOM'"}' >> "$MONITOR_FILE"
done
echo "[05/20] Tool calls (perso)..."
for tool in Read Agent Bash Read Edit Agent; do
    echo '{"event":"ToolUse","session_id":"'"$SID_PERSO"'","cwd":"/home/user/side-project","timestamp":"'"$(TS)"'","profile":"perso","tool_name":"'"$tool"'","tool_use_id":"tu-'$RANDOM'"}' >> "$MONITOR_FILE"
done
sleep 0.3

# Tool errors
echo "[06/20] Tool errors..."
echo '{"event":"ToolError","session_id":"'"$SID_PRO"'","cwd":"/home/user/work-project","timestamp":"'"$(TS)"'","profile":"pro","tool_name":"Bash","tool_use_id":"tu-err-1","error":"Permission denied","is_interrupt":false}' >> "$MONITOR_FILE"
echo '{"event":"ToolError","session_id":"'"$SID_PERSO"'","cwd":"/home/user/side-project","timestamp":"'"$(TS)"'","profile":"perso","tool_name":"Edit","tool_use_id":"tu-err-2","error":"old_string not found","is_interrupt":false}' >> "$MONITOR_FILE"
sleep 0.3

# Agents with branch
echo "[07/20] Starting 3 agents..."
echo '{"event":"SubagentStart","agent_id":"agent-pro-001","agent_type":"Explore","session_id":"'"$SID_PRO"'","cwd":"/home/user/work-project","timestamp":"'"$(TS)"'","profile":"pro","branch":"main"}' >> "$MONITOR_FILE"
sleep 0.5
echo '{"event":"SubagentStart","agent_id":"agent-pro-002","agent_type":"Plan","session_id":"'"$SID_PRO"'","cwd":"/home/user/work-project","timestamp":"'"$(TS)"'","profile":"pro","branch":"main"}' >> "$MONITOR_FILE"
sleep 0.5
echo '{"event":"SubagentStart","agent_id":"agent-perso-001","agent_type":"general-purpose","session_id":"'"$SID_PERSO"'","cwd":"/home/user/side-project","timestamp":"'"$(TS)"'","profile":"perso","branch":"feat/dashboard"}' >> "$MONITOR_FILE"
sleep 1

# Context compaction with tokens
echo "[08/20] Context compaction (perso, 450K tokens)..."
echo '{"event":"Compact","session_id":"'"$SID_PERSO"'","cwd":"/home/user/side-project","timestamp":"'"$(TS)"'","profile":"perso","trigger":"auto","context_tokens":450000}' >> "$MONITOR_FILE"
sleep 0.5

# Worktree
echo "[09/20] Worktree created..."
echo '{"event":"WorktreeCreate","session_id":"'"$SID_PRO"'","cwd":"/home/user/work-project","timestamp":"'"$(TS)"'","profile":"pro","name":"agent-wt-001"}' >> "$MONITOR_FILE"
sleep 0.3

# Tasks
echo "[10/20] Tasks completed..."
echo '{"event":"TaskDone","session_id":"'"$SID_PRO"'","cwd":"/home/user/work-project","timestamp":"'"$(TS)"'","profile":"pro","task_id":"task-001","task_subject":"Fix login bug"}' >> "$MONITOR_FILE"
echo '{"event":"TaskDone","session_id":"'"$SID_PRO"'","cwd":"/home/user/work-project","timestamp":"'"$(TS)"'","profile":"pro","task_id":"task-002","task_subject":"Add unit tests"}' >> "$MONITOR_FILE"
sleep 0.3

# More prompts
echo "[11/20] More prompts..."
echo '{"event":"Prompt","session_id":"'"$SID_PRO"'","cwd":"/home/user/work-project","timestamp":"'"$(TS)"'","profile":"pro"}' >> "$MONITOR_FILE"
echo '{"event":"Prompt","session_id":"'"$SID_PRO"'","cwd":"/home/user/work-project","timestamp":"'"$(TS)"'","profile":"pro"}' >> "$MONITOR_FILE"
echo '{"event":"Prompt","session_id":"'"$SID_PERSO"'","cwd":"/home/user/side-project","timestamp":"'"$(TS)"'","profile":"perso"}' >> "$MONITOR_FILE"
sleep 0.5

# Cost events
echo "[12/20] Cost events..."
echo '{"event":"Cost","session_id":"'"$SID_PRO"'","cwd":"/home/user/work-project","timestamp":"'"$(TS)"'","profile":"pro","cost_usd":0.42,"tokens":28000,"input":500,"output":12000,"cache_read":15000,"cache_create":500}' >> "$MONITOR_FILE"
echo '{"event":"Cost","session_id":"'"$SID_PERSO"'","cwd":"/home/user/side-project","timestamp":"'"$(TS)"'","profile":"perso","cost_usd":1.87,"tokens":95000,"input":1000,"output":35000,"cache_read":55000,"cache_create":4000}' >> "$MONITOR_FILE"
sleep 1

# Stop agents
echo "[13/20] Stopping Explore (pro)..."
echo '{"event":"SubagentStop","agent_id":"agent-pro-001","agent_type":"Explore","session_id":"'"$SID_PRO"'","cwd":"/home/user/work-project","timestamp":"'"$(TS)"'","profile":"pro","summary":"Found 3 relevant files in the authentication module"}' >> "$MONITOR_FILE"
sleep 1
echo "[14/20] Stopping Plan (pro)..."
echo '{"event":"SubagentStop","agent_id":"agent-pro-002","agent_type":"Plan","session_id":"'"$SID_PRO"'","cwd":"/home/user/work-project","timestamp":"'"$(TS)"'","profile":"pro","summary":"Designed 4-step migration plan for the database schema"}' >> "$MONITOR_FILE"
sleep 1
echo "[15/20] Stopping general-purpose (perso)..."
echo '{"event":"SubagentStop","agent_id":"agent-perso-001","agent_type":"general-purpose","session_id":"'"$SID_PERSO"'","cwd":"/home/user/side-project","timestamp":"'"$(TS)"'","profile":"perso","summary":"Refactored the API handler to use async middleware"}' >> "$MONITOR_FILE"
sleep 0.5

# Worktree removed
echo "[16/20] Worktree removed..."
echo '{"event":"WorktreeRemove","session_id":"'"$SID_PRO"'","cwd":"/home/user/work-project","timestamp":"'"$(TS)"'","profile":"pro","worktree_path":"/home/user/work-project/.claude/worktrees/agent-wt-001"}' >> "$MONITOR_FILE"
sleep 0.3

# Stop
echo "[17/20] Claude stop (pro)..."
echo '{"event":"Stop","session_id":"'"$SID_PRO"'","cwd":"/home/user/work-project","timestamp":"'"$(TS)"'","profile":"pro"}' >> "$MONITOR_FILE"
sleep 0.3

echo "[18/20] Claude stop (perso)..."
echo '{"event":"Stop","session_id":"'"$SID_PERSO"'","cwd":"/home/user/side-project","timestamp":"'"$(TS)"'","profile":"perso"}' >> "$MONITOR_FILE"
sleep 0.3

# Updated cost after more work
echo "[19/20] Updated cost events..."
echo '{"event":"Cost","session_id":"'"$SID_PRO"'","cwd":"/home/user/work-project","timestamp":"'"$(TS)"'","profile":"pro","cost_usd":0.58,"tokens":38000,"input":700,"output":16000,"cache_read":20000,"cache_create":1300}' >> "$MONITOR_FILE"
echo '{"event":"Cost","session_id":"'"$SID_PERSO"'","cwd":"/home/user/side-project","timestamp":"'"$(TS)"'","profile":"perso","cost_usd":2.34,"tokens":120000,"input":1200,"output":45000,"cache_read":68000,"cache_create":5800}' >> "$MONITOR_FILE"
sleep 0.5

# End sessions
echo "[20/20] Ending sessions..."
echo '{"event":"SessionEnd","session_id":"'"$SID_PRO"'","cwd":"/home/user/work-project","timestamp":"'"$(TS)"'","profile":"pro","reason":"user_exit"}' >> "$MONITOR_FILE"
echo '{"event":"SessionEnd","session_id":"'"$SID_PERSO"'","cwd":"/home/user/side-project","timestamp":"'"$(TS)"'","profile":"perso","reason":"user_exit"}' >> "$MONITOR_FILE"

echo ""
echo "=== Test complete! ==="
echo ""
echo "Expected v3.0 features:"
echo "  Panel: idle → agents · sessions → idle"
echo "  Git branch: [main], [feat/dashboard] on agents and sessions"
echo "  Cost: \$0.58 (pro) + \$2.34 (perso) = \$2.92 total in metrics"
echo "  Context: ctx 225% on perso session (450K/200K)"
echo "  Metrics bar: Bash 6  Read 4  Edit 2  err 2  \$2.92"
echo "  Sessions: model + branch + cost + tools + ctx%"
echo "  Sound: plays on agent finish (if enabled in prefs)"
echo "  DND: auto-toggles (if enabled in prefs)"
echo "  Shortcut: Super+P toggles dropdown"
echo ""
echo "Clean up: rm $MONITOR_FILE"
