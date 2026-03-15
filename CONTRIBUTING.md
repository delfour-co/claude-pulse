# Contributing to Claude Pulse

Thanks for your interest in contributing!

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/claude-pulse.git`
3. Create a branch: `git checkout -b my-feature`
4. Make your changes
5. Test locally (see below)
6. Commit and push
7. Open a Pull Request

## Development Setup

### Prerequisites

- GNOME Shell 45+
- `jq`
- Claude Code CLI (for end-to-end testing)

### Install for development

```bash
# Symlink the extension for live development
ln -sf "$(pwd)/extension" ~/.local/share/gnome-shell/extensions/claude-pulse@delfour.co

# Install the hook
bash scripts/install.sh
```

### Testing changes

GNOME Shell extensions cannot be hot-reloaded on Wayland. After editing `extension.js`:

- **X11**: Press `Alt+F2`, type `r`, press Enter
- **Wayland**: Log out and log back in

Use the test script to simulate events:

```bash
bash scripts/test.sh
```

### Linting

```bash
# Shell scripts
shellcheck scripts/*.sh hooks/*.sh

# JavaScript syntax
node --check extension/extension.js
```

## Code Style

- JavaScript: 4-space indentation, single quotes, ES module imports
- Shell: Follow [Google Shell Style Guide](https://google.github.io/styleguide/shellguide.html)
- Keep it simple — avoid over-engineering

## Pull Request Guidelines

- One feature/fix per PR
- Include a clear description of what and why
- Update the CHANGELOG if adding user-facing changes
- Ensure `shellcheck` passes on all shell scripts

## Reporting Bugs

Use the [bug report template](https://github.com/delfour-co/claude-pulse/issues/new?template=bug_report.yml) and include:

- GNOME Shell version (`gnome-shell --version`)
- Linux distribution
- Steps to reproduce
- Relevant logs (`journalctl /usr/bin/gnome-shell -b | grep -i claude`)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
