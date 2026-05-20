# Claude Pulse

**Real-time observability for Claude Code agents, right in your GNOME desktop.**

Claude Pulse hooks into [Claude Code](https://code.claude.com/)'s lifecycle events and displays a live dashboard in your top panel — agent count, activity graph with smooth curves, tool usage stats, error tracking, and session metrics. Multi-profile support, desktop notifications, and 4 visual themes.

## Features

- **Panel indicator** — live agent count with custom SVG icon
- **Activity graph** — Cairo-rendered chart with Catmull-Rom curves, gradient fills, glow effects
- **4 themes** — Default, Compact, Cyberpunk, Tron — switch instantly in preferences
- **13 event types** captured — agents, sessions, tools, errors, compactions, tasks, worktrees, prompts
- **Tool usage stats** — ranked summary (Edit:130 Read:42 Grep:37) displayed in the graph
- **Error tracking** — tool failures and context compaction alerts
- **Desktop notifications** — 6 configurable triggers (agent stop, start, compaction, error, task, Claude relay)
- **Click to open** project directory in file manager
- **Session details** — model name, duration, per-session metrics breakdown
- **Multi-profile** — auto-detects all `~/.claude*` directories, tags events with profile name
- **Preferences dialog** — theme selector, notification toggles, cleanup settings
- **Auto-cleanup** — stale agent removal (30min), events file rotation (100KB)

## Requirements

- GNOME Shell 45–49
- [Claude Code](https://code.claude.com/) CLI
- `jq`

## Install

### From source (all distros)

```bash
git clone https://github.com/kdelfour/claude-pulse.git
cd claude-pulse
bash scripts/install.sh
```

### Fedora (COPR)

```bash
sudo dnf copr enable kdelfour/claude-pulse
sudo dnf install gnome-shell-extension-claude-pulse
```

### Arch Linux (AUR)

```bash
yay -S gnome-shell-extension-claude-pulse
```

### Ubuntu/Debian (PPA)

```bash
sudo add-apt-repository ppa:delfour-co/claude-pulse
sudo apt install gnome-shell-extension-claude-pulse
```

Or, if you prefer not to add a PPA, grab the `.deb` from the [latest GitHub Release](https://github.com/delfour-co/claude-pulse/releases/latest) and run `sudo apt install ./gnome-shell-extension-claude-pulse_*.deb`.

On Wayland, log out and back in for the extension to load. Then configure hooks: `bash /usr/bin/claude-pulse-hook.sh` (packaged installs) or `bash scripts/install.sh` (source install).

## How It Works

```
Claude Code (13 hooks)              Claude Pulse
──────────────────────              ─────────────────────
SubagentStart/Stop ──▶              ┌─────────────────────┐
SessionStart/End   ──▶  events      │ ❯_ 3 agents         │
PreToolUse         ──▶  .jsonl      ├─────────────────────┤
PostToolUseFailure ──▶    ↓         │ ▄██▄ (graph)         │
PreCompact         ──▶  inotify     ├─────────────────────┤
TaskCompleted      ──▶    +         │ ● Explore — proj     │
UserPromptSubmit   ──▶  polling     │ Edit:130 Read:42     │
Notification/Stop  ──▶  (5s)       └─────────────────────┘
```

A bash hook script captures events from Claude Code and writes them to `~/.local/share/claude-pulse/events.jsonl`. The GNOME extension watches this file and renders the dashboard.

## Live cost

The session cost shown in the panel updates after every tool call, prefixed with `~`
(e.g. `~$0.42`). When the assistant turn ends, the Stop hook re-parses the full
transcript and emits the authoritative value, dropping the `~` prefix and matching
the canonical calculation exactly.

To disable live updates and only see the final cost on Stop, export in the shell
that launches Claude Code (e.g. in your `~/.bashrc` / `~/.zshrc`):

```bash
export CLAUDE_PULSE_LIVE_COST=0
```

Implementation notes:

- The `PostToolUse` hook does an incremental parse of the transcript: only the
  bytes written since the previous invocation are scanned, with cumulative state
  persisted next to the transcript as `cost-state-<session_id>.json`. Added
  latency per tool call is under ~50 ms on typical hardware.
- When the feature is off, `PostToolUse` is a no-op — there is no timer and no
  background work.
- The `Stop` hook still re-parses the full transcript and is the source of
  truth; the state file is never consulted for the final number.
- Pricing (including the 1.25× cache-creation multiplier) lives in
  `hooks/compute-cost.sh` and is the single source of truth for both modes.

## Themes

| Theme | Style |
|---|---|
| **Default** | Blue/cyan gradients on dark — balanced and clean |
| **Compact** | Same palette, 44px graph — minimal footprint |
| **Cyberpunk** | Neon pink/cyan/yellow — high contrast, wide glow |
| **Tron** | Orange/blue on black — cinematic, deep shadows |

Switch themes instantly in the preferences dialog (cog icon in the dropdown footer).

## Documentation

[Wiki](https://github.com/kdelfour/claude-pulse/wiki): [Installation](https://github.com/kdelfour/claude-pulse/wiki/Installation) · [Configuration](https://github.com/kdelfour/claude-pulse/wiki/Configuration) · [Metrics](https://github.com/kdelfour/claude-pulse/wiki/Metrics) · [Activity Graph](https://github.com/kdelfour/claude-pulse/wiki/Activity-Graph) · [Troubleshooting](https://github.com/kdelfour/claude-pulse/wiki/Troubleshooting)

## Testing

```bash
bash scripts/test.sh  # simulates all 13 event types
```

## Uninstall

```bash
bash scripts/uninstall.sh        # keep event data
bash scripts/uninstall.sh --purge # remove everything
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Community contributions welcome for [KDE](https://github.com/kdelfour/claude-pulse/issues/11), [Waybar](https://github.com/kdelfour/claude-pulse/issues/12), and [Quickshell](https://github.com/kdelfour/claude-pulse/issues/13) frontends.

## License

[MIT](LICENSE) — Delfour.co
