# Claude Pulse

**Monitor your Claude Code agents in real-time from your GNOME desktop.**

Claude Pulse is a GNOME Shell extension that shows the number of active [Claude Code](https://code.claude.com/) agents directly in your top panel. Click to see a dropdown with agent details — type, project, duration, and profile. Get desktop notifications when agents finish.

## Features

- **Live agent count** in the GNOME top panel
- **Dropdown menu** with active agent details (type, project, duration)
- **Desktop notifications** when agents complete
- **Multi-profile support** — track agents across multiple Claude Code configurations (e.g. `pro`, `perso`)
- **Auto-discovery** of all `~/.claude*` config directories
- **Zero dependencies** beyond GNOME Shell and `jq`

## Requirements

- GNOME Shell 45+ (tested on 49)
- [Claude Code](https://code.claude.com/) CLI
- `jq` command-line JSON processor

## Quick Install

```bash
# Clone the repository
git clone https://github.com/delfour-co/claude-pulse.git
cd claude-pulse

# Run the installer
bash scripts/install.sh
```

The installer will:
1. Copy the extension to `~/.local/share/gnome-shell/extensions/`
2. Install the hook script to `~/.local/bin/`
3. Auto-configure Claude Code hooks in all detected `~/.claude*` directories
4. Enable the extension

**On Wayland**, you need to log out and back in for the extension to load.

## How It Works

```
Claude Code                     Claude Pulse
────────────                    ─────────────────────
SubagentStart ──hook──▶ events.jsonl ──▶ ┌─────────────┐
SubagentStop  ──hook──▶     ↓            │ 🖥 3 agents  │
SessionStart  ──hook──▶  (JSONL)         ├─────────────┤
SessionEnd    ──hook──▶                  │ ● Explore …  │
                                         │ ● Plan …     │
                                         └─────────────┘
```

1. **Claude Code hooks** fire on agent/session lifecycle events
2. The **hook script** writes structured JSON events to `~/.local/share/claude-pulse/events.jsonl`
3. The **GNOME extension** watches the file and updates the panel in real-time

## Multi-Profile Support

Claude Pulse automatically detects multiple Claude Code configurations:

| Directory | Profile tag |
|---|---|
| `~/.claude` | `[pro]` |
| `~/.claude-perso` | `[perso]` |
| `~/.claude-*` | `[*]` |

Each profile gets its own `CLAUDE_PROFILE` environment variable set in the hook, so events are tagged and displayed with the correct profile in the panel menu.

## Testing

Simulate agent events to verify the extension works:

```bash
bash scripts/test.sh
```

## Uninstall

```bash
bash scripts/uninstall.sh

# To also remove event data:
bash scripts/uninstall.sh --purge
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE) — Delfour.co
