#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
EXT_UUID="claude-pulse@delfour.co"
EXT_SRC="$PROJECT_DIR/extension"
EXT_DEST="$HOME/.local/share/gnome-shell/extensions/$EXT_UUID"
HOOK_DEST="$HOME/.local/bin/claude-pulse-hook.sh"
MONITOR_FILE="${XDG_DATA_HOME:-$HOME/.local/share}/claude-pulse/events.jsonl"

echo "=== Claude Pulse — Install ==="
echo ""

# 1. Check dependencies
echo "[1/5] Checking dependencies..."

if ! command -v jq &>/dev/null; then
    echo "  ERROR: jq is required. Install with: sudo dnf install jq"
    exit 1
fi
echo "  ✓ jq found"

if ! command -v gnome-shell &>/dev/null; then
    echo "  ERROR: GNOME Shell is required."
    exit 1
fi
GNOME_VERSION=$(gnome-shell --version | grep -oP '\d+' | head -1)
echo "  ✓ GNOME Shell $GNOME_VERSION found"

# 2. Install extension
echo ""
echo "[2/5] Installing GNOME Shell extension..."
mkdir -p "$EXT_DEST"
cp -r "$EXT_SRC"/* "$EXT_DEST/"
echo "  ✓ Extension installed: $EXT_DEST"

# 3. Install hook script
echo ""
echo "[3/5] Installing hook script..."
mkdir -p "$(dirname "$HOOK_DEST")"
cp "$PROJECT_DIR/hooks/claude-pulse-hook.sh" "$HOOK_DEST"
chmod +x "$HOOK_DEST"
echo "  ✓ Installed: $HOOK_DEST"

# 4. Configure Claude Code hooks for all detected config directories
echo ""
echo "[4/5] Configuring Claude Code hooks..."

CLAUDE_DIRS=()
for dir in "$HOME"/.claude "$HOME"/.claude-*; do
    if [ -d "$dir" ]; then
        if [ -f "$dir/settings.json" ] || [ -f "$dir/.credentials.json" ]; then
            CLAUDE_DIRS+=("$dir")
        fi
    fi
done

if [ ${#CLAUDE_DIRS[@]} -eq 0 ]; then
    echo "  No Claude config directories found. Creating default at ~/.claude/"
    CLAUDE_DIRS=("$HOME/.claude")
fi

echo "  Found ${#CLAUDE_DIRS[@]} Claude config(s):"

install_hooks_for_dir() {
    local config_dir="$1"
    local profile_name="$2"
    local settings_file="$config_dir/settings.json"
    local hook_cmd="CLAUDE_PROFILE=$profile_name $HOOK_DEST"

    local hook_config
    hook_config=$(jq -nc --arg cmd "$hook_cmd" '{
        "SubagentStart": [{"hooks": [{"type": "command", "command": $cmd}]}],
        "SubagentStop": [{"hooks": [{"type": "command", "command": $cmd}]}],
        "SessionStart": [{"hooks": [{"type": "command", "command": $cmd}]}],
        "SessionEnd": [{"hooks": [{"type": "command", "command": $cmd}]}]
    }')

    mkdir -p "$config_dir"

    if [ -f "$settings_file" ]; then
        local existing
        existing=$(cat "$settings_file")
        if echo "$existing" | jq -e '.hooks' &>/dev/null; then
            echo "$existing" | jq --argjson new_hooks "$hook_config" '
                .hooks = ((.hooks // {}) * $new_hooks)
            ' > "$settings_file"
        else
            echo "$existing" | jq --argjson hooks "$hook_config" '. + {hooks: $hooks}' > "$settings_file"
        fi
    else
        echo "$hook_config" | jq '{hooks: .}' > "$settings_file"
    fi

    echo "    ✓ [$profile_name] $settings_file"
}

for dir in "${CLAUDE_DIRS[@]}"; do
    dirname=$(basename "$dir")
    case "$dirname" in
        .claude) profile="pro" ;;
        .claude-*) profile="${dirname#.claude-}" ;;
        *) profile="default" ;;
    esac
    install_hooks_for_dir "$dir" "$profile"
done

# 5. Prepare events file
echo ""
echo "[5/5] Preparing events file..."
mkdir -p "$(dirname "$MONITOR_FILE")"
touch "$MONITOR_FILE"
echo "  ✓ Events file: $MONITOR_FILE"

# Enable the extension
echo ""
echo "=== Enabling extension... ==="
gnome-extensions enable "$EXT_UUID" 2>/dev/null && echo "  ✓ Extension enabled!" || {
    echo "  ⚠ Could not enable automatically."
    echo "  On Wayland, you may need to log out and back in, then run:"
    echo "    gnome-extensions enable $EXT_UUID"
}

echo ""
echo "=== Installation complete! ==="
echo ""
echo "If the extension doesn't appear immediately:"
echo "  1. Log out and log back in (required on Wayland)"
echo "  2. Or press Alt+F2, type 'r', press Enter (X11 only)"
echo ""
echo "To test with simulated events:"
echo "  bash $SCRIPT_DIR/test.sh"
echo ""
echo "To uninstall:"
echo "  bash $SCRIPT_DIR/uninstall.sh"
echo ""
