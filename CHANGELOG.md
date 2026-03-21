# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [1.0.0] - 2026-03-16

### Features

- **Panel indicator** — Live agent count + session count with custom SVG pulse icon
- **Activity graph** — Cairo-rendered chart with Catmull-Rom spline curves, gradient fills, glow effects, 10-minute rolling window
- **4 visual themes** — Default, Compact, Cyberpunk, Tron with full color customization (graph, icons, badges, metrics)
- **13 event types captured** — Agents, sessions, tools, errors, compactions, tasks, worktrees, prompts, notifications, stop
- **Exact cost tracking** — Parses transcript JSONL for real token counts, applies per-model pricing (Opus/Sonnet/Haiku)
- **Context health indicator** — Tracks context_tokens at compaction time, displays ctx% in session metrics
- **Git branch display** — Branch name captured via hook, shown on agents and sessions
- **Tool usage stats** — Ranked tool calls with themed colors under the activity graph
- **Error tracking** — Tool failure count and context compaction alerts
- **Per-session metrics** — Cost, tools, errors, compactions, prompts, agents spawned, context health
- **Desktop notifications** — 6 configurable triggers: agent stop/start, compaction, tool error, task done, Claude relay
- **Auto Do Not Disturb** — Toggles GNOME DND when agents are active (configurable)
- **Sound alerts** — System sound on agent finish via canberra-gtk-play (configurable)
- **Keyboard shortcut** — Super+P toggles dropdown menu
- **Custom SVG icons** — Agent (robot), session (console), GitHub, settings (cog), panel pulse
- **Profile badges** — Colored pill tags (perso, pro) on agents and sessions, themed per-theme
- **Click to open** — Click agent entries to open project directory in file manager
- **Multi-profile** — Auto-detects all `~/.claude*` directories, tags events with profile name
- **Preferences dialog** — Theme selector, 6 notification toggles, DND/sound toggles, cleanup settings
- **Stale agent cleanup** — Configurable timeout (default 30min)
- **Events file rotation** — Auto-truncate when idle and exceeding max size (default 100KB)
- **GNOME Shell 45–49** compatible
