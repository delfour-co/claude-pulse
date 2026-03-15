#!/bin/bash
set -euo pipefail

MONITOR_FILE="${XDG_DATA_HOME:-$HOME/.local/share}/claude-pulse/events.jsonl"
mkdir -p "$(dirname "$MONITOR_FILE")"

echo "=== Claude Pulse — Test ==="
echo ""
echo "Simulating Claude Code agent events from two profiles."
echo "Events file: $MONITOR_FILE"
echo ""

TS() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }

echo "[1/9] Starting session (pro)..."
echo '{"event":"SessionStart","session_id":"sess-pro-001","cwd":"/home/user/work-project","timestamp":"'"$(TS)"'","model":"claude-sonnet-4-6","profile":"pro"}' >> "$MONITOR_FILE"
sleep 0.5

echo "[2/9] Starting session (perso)..."
echo '{"event":"SessionStart","session_id":"sess-perso-001","cwd":"/home/user/side-project","timestamp":"'"$(TS)"'","model":"claude-sonnet-4-6","profile":"perso"}' >> "$MONITOR_FILE"
sleep 1

echo "[3/9] Starting agent: Explore (pro)..."
echo '{"event":"SubagentStart","agent_id":"agent-pro-001","agent_type":"Explore","session_id":"sess-pro-001","cwd":"/home/user/work-project","timestamp":"'"$(TS)"'","profile":"pro"}' >> "$MONITOR_FILE"
sleep 1

echo "[4/9] Starting agent: Plan (pro)..."
echo '{"event":"SubagentStart","agent_id":"agent-pro-002","agent_type":"Plan","session_id":"sess-pro-001","cwd":"/home/user/work-project","timestamp":"'"$(TS)"'","profile":"pro"}' >> "$MONITOR_FILE"
sleep 1

echo "[5/9] Starting agent: general-purpose (perso)..."
echo '{"event":"SubagentStart","agent_id":"agent-perso-001","agent_type":"general-purpose","session_id":"sess-perso-001","cwd":"/home/user/side-project","timestamp":"'"$(TS)"'","profile":"perso"}' >> "$MONITOR_FILE"
sleep 3

echo "[6/9] Stopping agent: Explore (pro)..."
echo '{"event":"SubagentStop","agent_id":"agent-pro-001","agent_type":"Explore","session_id":"sess-pro-001","cwd":"/home/user/work-project","timestamp":"'"$(TS)"'","profile":"pro"}' >> "$MONITOR_FILE"
sleep 2

echo "[7/9] Stopping agent: Plan (pro)..."
echo '{"event":"SubagentStop","agent_id":"agent-pro-002","agent_type":"Plan","session_id":"sess-pro-001","cwd":"/home/user/work-project","timestamp":"'"$(TS)"'","profile":"pro"}' >> "$MONITOR_FILE"
sleep 2

echo "[8/9] Stopping agent: general-purpose (perso)..."
echo '{"event":"SubagentStop","agent_id":"agent-perso-001","agent_type":"general-purpose","session_id":"sess-perso-001","cwd":"/home/user/side-project","timestamp":"'"$(TS)"'","profile":"perso"}' >> "$MONITOR_FILE"
sleep 1

echo "[9/9] Ending sessions..."
echo '{"event":"SessionEnd","session_id":"sess-pro-001","cwd":"/home/user/work-project","timestamp":"'"$(TS)"'","profile":"pro"}' >> "$MONITOR_FILE"
echo '{"event":"SessionEnd","session_id":"sess-perso-001","cwd":"/home/user/side-project","timestamp":"'"$(TS)"'","profile":"perso"}' >> "$MONITOR_FILE"

echo ""
echo "=== Test complete! ==="
echo ""
echo "Expected behavior:"
echo "  - Panel count: 0 → 1 → 2 → 3 → 2 → 1 → 0"
echo "  - 3 desktop notifications when agents stopped"
echo "  - Profile tags [pro] and [perso] in the menu"
echo ""
echo "Clean up: rm $MONITOR_FILE"
