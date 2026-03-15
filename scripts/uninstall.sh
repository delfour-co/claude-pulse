#!/bin/bash
set -euo pipefail

EXT_UUID="claude-pulse@delfour.co"
EXT_DEST="$HOME/.local/share/gnome-shell/extensions/$EXT_UUID"
HOOK_DEST="$HOME/.local/bin/claude-pulse-hook.sh"
DATA_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/claude-pulse"

echo "=== Claude Pulse — Uninstall ==="
echo ""

# 1. Disable extension
echo "[1/4] Disabling extension..."
gnome-extensions disable "$EXT_UUID" 2>/dev/null && echo "  ✓ Extension disabled" || echo "  ⚠ Extension was not enabled"

# 2. Remove extension files
echo "[2/4] Removing extension files..."
if [ -d "$EXT_DEST" ]; then
    rm -rf "$EXT_DEST"
    echo "  ✓ Removed: $EXT_DEST"
else
    echo "  ⚠ Not found: $EXT_DEST"
fi

# 3. Remove hook script
echo "[3/4] Removing hook script..."
if [ -f "$HOOK_DEST" ]; then
    rm -f "$HOOK_DEST"
    echo "  ✓ Removed: $HOOK_DEST"
else
    echo "  ⚠ Not found: $HOOK_DEST"
fi

# 4. Data directory
echo "[4/4] Data directory..."
if [ -d "$DATA_DIR" ]; then
    if [ "${1:-}" = "--purge" ]; then
        rm -rf "$DATA_DIR"
        echo "  ✓ Removed: $DATA_DIR"
    else
        echo "  ⚠ Kept: $DATA_DIR (use --purge to remove)"
    fi
else
    echo "  ⚠ Not found: $DATA_DIR"
fi

echo ""
echo "=== Uninstall complete! ==="
echo ""
echo "Note: Hook entries in your Claude Code settings.json files were not removed."
echo "To remove them manually, edit the 'hooks' section in:"
for dir in "$HOME"/.claude "$HOME"/.claude-*; do
    if [ -f "$dir/settings.json" ]; then
        echo "  - $dir/settings.json"
    fi
done
echo ""
echo "You may need to log out and back in for the panel to update."
echo ""
