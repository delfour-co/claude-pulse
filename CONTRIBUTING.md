# Contributing to Claude Pulse

Thanks for your interest in contributing! This document explains how to participate.

## Governance

Claude Pulse is maintained by [Delfour.co](https://github.com/delfour-co). Kevin Delfour ([@kdelfour](https://github.com/kdelfour)) is the project lead and has final say on design decisions.

Community contributions are welcome and encouraged. All contributors are expected to follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## How to Contribute

### Reporting Bugs

Use the [bug report template](https://github.com/delfour-co/claude-pulse/issues/new?template=bug_report.yml). Include:
- GNOME Shell version (`gnome-shell --version`)
- Linux distribution and version
- Steps to reproduce
- Logs: `journalctl /usr/bin/gnome-shell -b | grep -i ClaudePulse`

### Suggesting Features

Use the [feature request template](https://github.com/delfour-co/claude-pulse/issues/new?template=feature_request.yml). Before creating a new issue, check the [existing discussions](https://github.com/delfour-co/claude-pulse/discussions) — your idea may already be there.

### Submitting Code

1. **Fork** the repository
2. **Create a branch** from `main`: `git checkout -b feat/my-feature`
3. **Make your changes** — keep commits focused and atomic
4. **Test locally** (see below)
5. **Push** your branch and open a **Pull Request**

#### Branch naming

- `feat/` — new features
- `fix/` — bug fixes
- `docs/` — documentation
- `refactor/` — code restructure without behavior change

#### Commit messages

Use clear, descriptive messages:
```
Add context health gauge to panel indicator

- Parse context_tokens from PreCompact events
- Display colored dot based on health state
- Configurable via GSettings
```

### Review Process

1. All PRs require **1 approval** from a maintainer
2. CI must pass (ShellCheck, JS syntax, schema validation, hook tests)
3. Maintainer may request changes — please address feedback promptly
4. Once approved, the maintainer merges via **squash merge**

## Development Setup

### Prerequisites

- GNOME Shell 45+ (tested on 49)
- `jq`
- `node` (for JS syntax checking)
- `shellcheck` (for linting shell scripts)
- Claude Code CLI (for end-to-end testing)

### Install for development

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/claude-pulse.git
cd claude-pulse

# Symlink the extension (live development)
ln -sf "$(pwd)/extension" ~/.local/share/gnome-shell/extensions/claude-pulse@delfour.co

# Install hooks
bash scripts/install.sh

# Compile schemas
glib-compile-schemas extension/schemas/
```

### Testing changes

GNOME Shell extensions **cannot be hot-reloaded on Wayland**. After editing `extension.js`:
- **Wayland**: Log out and log back in
- **X11**: Press `Alt+F2`, type `r`, press Enter

Simulate events:
```bash
bash scripts/test.sh
```

### Linting

All checks must pass before submitting a PR:

```bash
# Shell scripts
shellcheck scripts/*.sh hooks/*.sh

# JavaScript syntax
node --check extension/extension.js
node --check extension/prefs.js

# GSettings schema
glib-compile-schemas extension/schemas/
```

## Code Style

### JavaScript (GJS)
- 4-space indentation
- Single quotes for strings
- ESM imports (`import X from 'gi://X'`)
- No `var` — use `const` and `let`
- Clean up everything in `destroy()` / `disable()`

### Shell scripts
- `set -euo pipefail` at the top
- Quote all variables
- Use `jq` for JSON processing

### CSS
- Prefix all classes with `claude-`
- Theme-specific classes: `.claude-theme-{name} .claude-{element}`

### General
- Keep it simple — no over-engineering
- One feature per PR
- No new dependencies without discussion

## Architecture Overview

```
hooks/                  # Bash scripts called by Claude Code
  claude-pulse-hook.sh  # Main hook — writes events to JSONL
  compute-cost.sh       # Parses transcripts for token costs

extension/              # GNOME Shell extension
  extension.js          # Main logic: panel button, graphs, menu, events
  prefs.js              # Preferences dialog (Adw)
  stylesheet.css        # Custom CSS classes
  metadata.json         # Extension identity
  schemas/              # GSettings schema
  icons/                # Custom SVG icons

scripts/                # User-facing scripts
  install.sh            # Install extension + configure hooks
  uninstall.sh          # Remove everything
  test.sh               # Simulate all 13 event types
  package.sh            # Build .zip for distribution

packaging/              # Distribution packages
  fedora/               # RPM spec for COPR
  arch/                 # PKGBUILD for AUR
  ubuntu/               # Debian packaging for PPA
```

### Data flow

```
Claude Code → hooks → events.jsonl → extension → panel/menu/graphs
                                   ↑
                          ~/.claude*/sessions/*.json (PID check)
```

## Release Process

Releases are automated. Maintainer workflow:

1. Update `CHANGELOG.md`
2. `git tag vX.Y.Z && git push origin vX.Y.Z`
3. CI automatically:
   - Runs all tests
   - Builds zip, deb, tarball, spec, PKGBUILD
   - Creates GitHub Release with all artifacts
   - Uploads signed source package to Ubuntu PPA (WIP — not yet functional, users install from the `.deb` attached to the release)
   - Triggers Fedora COPR rebuild
   - Updates Arch AUR

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
