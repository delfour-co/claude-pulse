#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
EXT_DIR="$PROJECT_DIR/extension"
UUID="claude-pulse@delfour.co"
OUT="$PROJECT_DIR/$UUID.zip"

echo "=== Claude Pulse — Package ==="
echo ""

# Compile schemas
echo "[1/2] Compiling schemas..."
glib-compile-schemas "$EXT_DIR/schemas/"
echo "  ✓ Schemas compiled"

# Create zip
echo "[2/2] Creating extension package..."
cd "$EXT_DIR"
rm -f "$OUT"
zip -r "$OUT" \
    extension.js \
    prefs.js \
    metadata.json \
    stylesheet.css \
    icons/ \
    schemas/
echo "  ✓ Package created: $OUT"

echo ""
echo "To install locally:"
echo "  gnome-extensions install --force $OUT"
echo ""
echo "To submit to extensions.gnome.org:"
echo "  Upload $OUT at https://extensions.gnome.org/upload/"
echo ""
