# Claude Code panel icon — design spec

**Date:** 2026-05-20
**Status:** Approved (brainstorm validated by maintainer)
**Scope:** Single GNOME-extension feature, no hook changes.

## Goal

Offer an optional Claude Code logo as the panel systray icon, recolored
based on session activity: neutral gray when idle, Anthropic orange when
at least one agent or session is active. The existing custom "pulse"
icon remains the default to avoid silently changing the visual identity
of existing installs.

## Non-goals

- Replacing the existing `claude-pulse-symbolic.svg` (kept as default).
- User-configurable idle/active colors. Out of scope for this PR; can be
  added later as two extra GSettings keys without touching this design.
- Tying icon colors to the active theme. The maintainer explicitly chose
  brand-consistent gray/orange regardless of theme.
- Animations (pulse, fade, transition). Plain instantaneous color flip.

## Assets

Add two files under `extension/icons/`:

- `claudecode-symbolic.svg` — the monochrome variant of
  `claudecode.svg` from
  [lobehub/lobe-icons](https://github.com/lobehub/lobe-icons)
  (MIT, © 2023 LobeHub). The SVG uses `fill="currentColor"`, so a single
  asset covers both color states via CSS.
- `LOBE_ICONS_LICENSE` — copy of the MIT license text from lobe-icons,
  required for redistribution.

The existing `claude-pulse-symbolic.svg` is **not** modified or removed.

## GSettings

Add one new key to the existing schema
`org.gnome.shell.extensions.claude-pulse`:

```xml
<key name="icon-style" type="s">
  <default>'pulse'</default>
  <summary>Panel systray icon style</summary>
  <description>Panel systray icon style. One of: pulse, claudecode. The claudecode variant recolors on activity (gray idle, Anthropic orange active).</description>
</key>
```

The default `'pulse'` preserves the current look for users who upgrade.
Plain `type="s"` (no `<choices>` block) matches the convention already
used for the existing `theme` and `panel-position` keys in the same
schema file.

`scripts/install.sh` already recompiles the schema, so no install
changes are needed.

## Extension behavior

### Initial render

In the constructor where `this._icon` is built (around `extension.js:618`):

1. Read the `icon-style` setting from the existing settings binding.
2. Choose the SVG path based on its value:
   - `"pulse"` → `icons/claude-pulse-symbolic.svg` (current behavior).
   - `"claudecode"` → `icons/claudecode-symbolic.svg`.
3. Build the `St.Icon` with the chosen `gicon`. Apply
   `style = "color: #7d7d7d;"` only when the style is `"claudecode"`
   (the pulse SVG has its colors baked in and must keep its static look).

### Activity-driven recolor

In `_updateMenu()` (around `extension.js:1148`) where `isActive` is
already computed:

- If `icon-style === "claudecode"`:
  - `isActive === true` → `this._icon.style = "color: #D97757;"`
  - `isActive === false` → `this._icon.style = "color: #7d7d7d;"`
- If `icon-style === "pulse"`: do not touch `this._icon.style`. The
  existing static appearance is preserved exactly.

### Runtime setting change

Bind the `icon-style` key change. When it changes:

1. Update `this._icon.gicon` to the new SVG path.
2. Re-apply the appropriate `style` (or clear it for `"pulse"`).

No GNOME Shell restart required to toggle.

## Colors

| State | Hex | Source |
|-------|-----|--------|
| Idle (claudecode) | `#7d7d7d` | Neutral gray, readable on light and dark panels |
| Active (claudecode) | `#D97757` | Anthropic brand orange, lifted from lobe-icons' `claudecode-color.svg` |
| Pulse (default mode) | unchanged | `#bebebe` baked into `claude-pulse-symbolic.svg` |

Hardcoded in `extension.js`, not in CSS, so they survive theme switching.

## Preferences UI

In `prefs.js`, add a single row to the existing settings group:

- Label: **Panel icon**
- Widget: dropdown (`Gtk.DropDown`) with two entries
  - "Pulse (default)" → maps to setting value `pulse`
  - "Claude Code logo" → maps to setting value `claudecode`

Bind the dropdown's selection to `icon-style` via the existing
`Gio.Settings` instance — same pattern used for the theme dropdown
already present in the file.

## Documentation

In `README.md`:

- New short subsection under the existing themes/customization area:
  > **Panel icon style.** The systray icon defaults to the project's
  > custom "pulse" mark. From Preferences, you can switch to the
  > Claude Code logo, which turns Anthropic orange when an agent or
  > session is active and neutral gray otherwise.

- New line in the Credits/License section:
  > Claude Code panel icon variant: lobe-icons by LobeHub (MIT,
  > © 2023). Claude is a trademark of Anthropic; this project is
  > independent and unaffiliated.

In `CHANGELOG.md`:

- New `[1.3.0]` entry dated 2026-05-20:
  > **Optional Claude Code panel icon** — A new preferences toggle
  > swaps the default "pulse" panel icon for the Claude Code logo,
  > recolored to Anthropic orange while active and neutral gray when
  > idle. Existing installs keep the pulse icon by default.

## Testing

No new automated tests. Rationale: the change is purely visual, the
hook surface is unchanged, and the existing CI does not cover GNOME
Shell rendering.

Manual verification checklist (added to PR description):

1. Fresh install — panel shows pulse icon, no behavior change.
2. Open Preferences, switch to Claude Code logo — icon swaps without
   restart, idle → gray.
3. Start a Claude Code session — icon turns orange. Stop session →
   returns to gray.
4. Switch back to pulse in Preferences — original icon restored,
   no color flip on activity.
5. Settings preserved across GNOME Shell restart (logout/login on
   Wayland).

## Packaging impact

None. The change adds two files inside `extension/icons/` (one SVG and
one license text). The .deb, .rpm, and PKGBUILD already glob the
extension directory; no spec changes required.

## Open questions

None. Brainstorm produced a clear scope and explicit user choices on
all three structural questions (scope: opt-in via setting; rendering:
instantaneous color flip; colors: hardcoded gray/orange).
