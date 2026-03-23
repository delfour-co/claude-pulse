# Security Policy

## Scope

Claude Pulse is a GNOME Shell extension that monitors Claude Code agents. It:
- Reads a local JSONL events file
- Reads Claude Code session PID files to detect active sessions
- Optionally parses transcript files for cost calculation
- Does **not** transmit any data over the network
- Does **not** store credentials or tokens

## Supported Versions

| Version | Supported |
|---|---|
| 1.0.x | ✅ |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it privately:

1. **Do not** open a public issue
2. Email **contact@delfour.co** with:
   - Description of the vulnerability
   - Steps to reproduce
   - Impact assessment
3. You will receive a response within 48 hours
4. A fix will be released as soon as possible

## Known Considerations

- The events JSONL file (`~/.local/share/claude-pulse/events.jsonl`) contains session metadata (project paths, tool names, agent types). It does **not** contain code, prompts, or API keys.
- The `compute-cost.sh` script reads transcript files which contain API responses. These files are owned by the user and are not shared.
- The hook script runs with the same permissions as Claude Code.
