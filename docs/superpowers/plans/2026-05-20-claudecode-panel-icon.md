# Claude Code Panel Icon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional Claude Code logo as the GNOME Shell panel systray icon, recolored neutral gray when idle and Anthropic orange when an agent or session is active. The legacy "pulse" icon remains the default.

**Architecture:** New GSettings key `icon-style` (`pulse` default, `claudecode`). The constructor chooses the SVG path from the setting. `_update()` applies `style="color: #...;"` on the `St.Icon` only when the claudecode variant is selected. A `changed::icon-style` listener swaps the icon and re-applies color at runtime. No hook or CI changes.

**Tech Stack:** GJS / GNOME Shell 45–49 extension (St, Clutter, Gio.Settings), Adwaita (`Adw.ComboRow`) for prefs. No build step.

**Spec:** `docs/superpowers/specs/2026-05-20-claudecode-panel-icon-design.md`

---

## File Structure

**Create:**
- `extension/icons/claudecode-symbolic.svg` — monochrome Claude Code SVG from lobe-icons (MIT). Uses `fill="currentColor"` so a single file covers both color states.
- `extension/icons/LOBE_ICONS_LICENSE` — MIT license text for attribution.

**Modify:**
- `extension/schemas/org.gnome.shell.extensions.claude-pulse.gschema.xml` — add `icon-style` string key.
- `extension/extension.js` — read setting in `_init`, choose SVG, color flip in `_update()`, connect/disconnect change listener.
- `extension/prefs.js` — Adw.ComboRow in the Appearance group.
- `README.md` — short subsection + credits line.
- `CHANGELOG.md` — new `[1.3.0]` entry.

Each task below produces one commit.

---

### Task 1: Add the Claude Code SVG asset and license

**Files:**
- Create: `extension/icons/claudecode-symbolic.svg`
- Create: `extension/icons/LOBE_ICONS_LICENSE`

- [ ] **Step 1: Write the SVG file**

Create `extension/icons/claudecode-symbolic.svg` with this exact content (sourced from `lobehub/lobe-icons` `packages/static-svg/icons/claudecode.svg`):

```xml
<svg fill="currentColor" fill-rule="evenodd" height="1em" style="flex:none;line-height:1" viewBox="0 0 24 24" width="1em" xmlns="http://www.w3.org/2000/svg"><title>Claude Code</title><path clip-rule="evenodd" d="M20.998 10.949H24v3.102h-3v3.028h-1.487V20H18v-2.921h-1.487V20H15v-2.921H9V20H7.488v-2.921H6V20H4.487v-2.921H3V14.05H0V10.95h3V5h17.998v5.949zM6 10.949h1.488V8.102H6v2.847zm10.51 0H18V8.102h-1.49v2.847z"></path></svg>
```

- [ ] **Step 2: Write the license attribution file**

Create `extension/icons/LOBE_ICONS_LICENSE` with this exact content:

```
The Claude Code panel icon (claudecode-symbolic.svg) is sourced from
lobehub/lobe-icons (https://github.com/lobehub/lobe-icons), used and
redistributed under the following MIT License:

MIT License

Copyright (c) 2023 LobeHub

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

Note: "Claude" is a trademark of Anthropic, PBC. Claude Pulse is an
independent project and is not affiliated with or endorsed by Anthropic.
```

- [ ] **Step 3: Verify the SVG renders**

Run: `xdg-open extension/icons/claudecode-symbolic.svg`

Expected: a small black `[ ]` bracket-style shape opens in the default image viewer (the current panel foreground color will not apply outside GNOME Shell — that is normal).

If `xdg-open` is unavailable, instead run:

```bash
file extension/icons/claudecode-symbolic.svg
```

Expected output contains `SVG Scalable Vector Graphics image`.

- [ ] **Step 4: Commit**

```bash
git add extension/icons/claudecode-symbolic.svg extension/icons/LOBE_ICONS_LICENSE
git commit -m "extension: add Claude Code icon asset (lobe-icons, MIT)"
```

---

### Task 2: Add the `icon-style` GSettings key

**Files:**
- Modify: `extension/schemas/org.gnome.shell.extensions.claude-pulse.gschema.xml`

- [ ] **Step 1: Add the key to the schema**

Insert the following key just before the closing `</schema>` tag in `extension/schemas/org.gnome.shell.extensions.claude-pulse.gschema.xml` (place it right after the `panel-position` key for grouping with other appearance-related keys):

```xml
    <key name="icon-style" type="s">
      <default>'pulse'</default>
      <summary>Panel systray icon style</summary>
      <description>Panel systray icon style. One of: pulse, claudecode. The claudecode variant recolors on activity (gray idle, Anthropic orange active).</description>
    </key>
```

- [ ] **Step 2: Compile the schema locally to validate XML**

Run:

```bash
glib-compile-schemas --strict --dry-run extension/schemas/
```

Expected: no output, exit code 0. Any output means the XML is malformed — fix and re-run.

- [ ] **Step 3: Verify the key is readable after a real compile**

Run:

```bash
glib-compile-schemas extension/schemas/
GSETTINGS_SCHEMA_DIR=extension/schemas/ gsettings get org.gnome.shell.extensions.claude-pulse icon-style
```

Expected output: `'pulse'`

Then clean up the compiled file (it is generated by `scripts/install.sh` at install time and should not be committed):

```bash
rm extension/schemas/gschemas.compiled
```

- [ ] **Step 4: Confirm `gschemas.compiled` is git-ignored**

Run: `git status extension/schemas/`

Expected: only the modified `.xml` file appears. If `gschemas.compiled` appears, check `.gitignore` already contains a rule for it (the repo already builds schemas during install — confirm with `grep gschemas .gitignore`).

- [ ] **Step 5: Commit**

```bash
git add extension/schemas/org.gnome.shell.extensions.claude-pulse.gschema.xml
git commit -m "schema: add icon-style key (pulse|claudecode, default pulse)"
```

---

### Task 3: Wire `extension.js` to use the new setting

**Files:**
- Modify: `extension/extension.js` (constructor near line 618, `_update()` near line 1132, destroy near line 1448)

- [ ] **Step 1: Replace the static `_icon` construction with a setting-aware version**

In `extension.js`, find this block around lines 618–623:

```javascript
        this._icon = new St.Icon({
            gicon: Gio.icon_new_for_string(
                GLib.build_filenamev([extensionObject.path, 'icons', 'claude-pulse-symbolic.svg'])),
            style_class: 'system-status-icon',
        });
        this._box.add_child(this._icon);
```

Replace it with:

```javascript
        this._icon = new St.Icon({
            style_class: 'system-status-icon',
        });
        this._applyIconStyle();
        this._box.add_child(this._icon);
```

- [ ] **Step 2: Add the `_applyIconStyle` helper method**

Insert this method on the `ClaudePulseButton` class. A good location is right before `_update()`. Find the existing `_update()` method (search for `_update(`) and add this method directly above it:

```javascript
    _applyIconStyle() {
        const style = this._settings
            ? this._settings.get_string('icon-style')
            : 'pulse';
        const file = style === 'claudecode'
            ? 'claudecode-symbolic.svg'
            : 'claude-pulse-symbolic.svg';
        this._icon.gicon = Gio.icon_new_for_string(
            GLib.build_filenamev([this._extensionObject.path, 'icons', file]));
        if (style === 'claudecode') {
            // Color flip is applied per-update; set idle color as initial state.
            this._icon.style = 'color: #7d7d7d;';
        } else {
            // Pulse icon has baked-in colors — clear any previous override.
            this._icon.style = null;
        }
    }
```

- [ ] **Step 3: Apply the color flip in `_update()`**

Find the lines around 1140–1143 inside `_update()`:

```javascript
        this._label.text = statusText;
        this._label.style_class = isActive
            ? 'claude-panel-label-active'
            : 'claude-panel-label';
```

Insert these lines immediately after them:

```javascript

        // Icon color flip for the claudecode variant only.
        if (this._settings && this._settings.get_string('icon-style') === 'claudecode') {
            this._icon.style = isActive
                ? 'color: #D97757;'
                : 'color: #7d7d7d;';
        }
```

- [ ] **Step 4: Listen for runtime setting changes**

Find the existing theme listener around lines 716–721:

```javascript
        if (this._settings) {
            this._themeChangedId = this._settings.connect('changed::theme', () => {
                this._applyTheme();
                this._graph.queue_repaint();
            });
        }
```

Replace with this expanded block (keeps theme handling unchanged, adds icon-style handling inside the same `if`):

```javascript
        if (this._settings) {
            this._themeChangedId = this._settings.connect('changed::theme', () => {
                this._applyTheme();
                this._graph.queue_repaint();
            });
            this._iconStyleChangedId = this._settings.connect('changed::icon-style', () => {
                this._applyIconStyle();
                this._update();
            });
        }
```

The `_update()` call after `_applyIconStyle()` re-runs the color flip immediately so the new icon picks up the current active/idle state.

- [ ] **Step 5: Disconnect the listener on destroy**

Find the destroy block around line 1448:

```javascript
        if (this._themeChangedId && this._settings) {
            this._settings.disconnect(this._themeChangedId);
            this._themeChangedId = null;
        }
```

Add this block right after it:

```javascript

        if (this._iconStyleChangedId && this._settings) {
            this._settings.disconnect(this._iconStyleChangedId);
            this._iconStyleChangedId = null;
        }
```

- [ ] **Step 6: Confirm the edits landed**

GJS files cannot be reliably syntax-checked by Node (ESM + `gi://` imports). Functional verification happens at install + Shell reload (Task 6). For now confirm the structural edits are present:

```bash
grep -c "_applyIconStyle" extension/extension.js
grep -c "_iconStyleChangedId" extension/extension.js
grep -c "icon-style" extension/extension.js
```

Expected: each grep returns a count ≥ 2 (definition + usage). If any returns 0 or 1, re-check the corresponding step.

- [ ] **Step 7: Commit**

```bash
git add extension/extension.js
git commit -m "extension: wire icon-style setting (pulse/claudecode with color flip)"
```

---

### Task 4: Add the dropdown to `prefs.js`

**Files:**
- Modify: `extension/prefs.js` (Appearance group, after the `themeRow`)

- [ ] **Step 1: Add the icon-style ComboRow**

In `extension/prefs.js`, find the line that adds `themeRow` to `appearGroup`:

```javascript
        appearGroup.add(themeRow);
```

Insert this block immediately after that line, still inside the Appearance group:

```javascript

        const iconStyleModel = new Gtk.StringList();
        iconStyleModel.append('Pulse (default)');
        iconStyleModel.append('Claude Code logo');

        const iconStyleKeys = ['pulse', 'claudecode'];
        const currentIconStyle = settings.get_string('icon-style');
        const currentIconIdx = iconStyleKeys.indexOf(currentIconStyle);

        const iconStyleRow = new Adw.ComboRow({
            title: 'Panel icon',
            subtitle: 'Pulse stays neutral; Claude Code logo turns orange when active',
            model: iconStyleModel,
            selected: currentIconIdx >= 0 ? currentIconIdx : 0,
        });
        iconStyleRow.connect('notify::selected', () => {
            settings.set_string('icon-style', iconStyleKeys[iconStyleRow.selected]);
        });
        settings.connect('changed::icon-style', () => {
            iconStyleRow.selected = iconStyleKeys.indexOf(settings.get_string('icon-style'));
        });
        appearGroup.add(iconStyleRow);
```

This mirrors exactly the pattern used by the existing `themeRow` above it.

- [ ] **Step 2: Confirm the edits landed**

```bash
grep -c "iconStyleRow" extension/prefs.js
grep -c "icon-style" extension/prefs.js
```

Expected: `iconStyleRow` count ≥ 3 (declaration + 2 binding uses), `icon-style` count ≥ 3 (read + write + change listener). Functional verification happens at Task 6.

- [ ] **Step 3: Commit**

```bash
git add extension/prefs.js
git commit -m "prefs: add Panel icon dropdown (Pulse / Claude Code logo)"
```

---

### Task 5: Documentation

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Locate the existing themes documentation in README**

Run:

```bash
grep -n "^## \|^### " README.md | head -20
```

Identify the section that documents customization or themes (typically a header like "Themes" or "Customization"). The exact line number varies — proceed by finding the closest fit.

- [ ] **Step 2: Add the Panel icon subsection**

If a "Themes" or "Customization" section exists, append the following at the end of that section. If not, add it as a new subsection just before the "Live cost" section we added previously. The block to insert:

```markdown
### Panel icon

The systray icon defaults to the project's custom **Pulse** mark
(neutral, theme-independent). From **Preferences → Appearance → Panel icon**,
you can switch to the **Claude Code logo**, which turns Anthropic orange
(`#D97757`) when an agent or session is active and neutral gray
(`#7d7d7d`) otherwise. The toggle applies live; no GNOME Shell restart
is needed.
```

- [ ] **Step 3: Add the credits/attribution line**

Locate the existing "License" or "Credits" section in `README.md` (search with `grep -n "^## License\|^## Credits\|^## Acknowledgments" README.md`). Append this paragraph at the end of that section:

```markdown
The optional Claude Code panel icon is sourced from
[lobehub/lobe-icons](https://github.com/lobehub/lobe-icons)
(MIT, © 2023 LobeHub). See
[`extension/icons/LOBE_ICONS_LICENSE`](extension/icons/LOBE_ICONS_LICENSE)
for the full license text. "Claude" is a trademark of Anthropic, PBC;
Claude Pulse is an independent, unaffiliated project.
```

If no License or Credits section exists, create one with header `## Credits` at the end of the README and place the paragraph above inside it.

- [ ] **Step 4: Add the 1.3.0 changelog entry**

In `CHANGELOG.md`, find the existing `## [1.2.0]` heading and insert this block directly above it (immediately after the initial format-description paragraph):

```markdown
## [1.3.0] - 2026-05-20

### Features

- **Optional Claude Code panel icon** — A new **Preferences → Appearance → Panel icon** dropdown swaps the default "Pulse" panel icon for the Claude Code logo, which turns Anthropic orange (`#D97757`) while at least one agent or session is active and neutral gray (`#7d7d7d`) when idle. Existing installs keep the Pulse icon by default.

### Credits

- Claude Code icon variant sourced from [lobehub/lobe-icons](https://github.com/lobehub/lobe-icons) (MIT, © 2023 LobeHub). "Claude" is a trademark of Anthropic, PBC.

```

- [ ] **Step 5: Commit**

```bash
git add README.md CHANGELOG.md
git commit -m "docs: document optional Claude Code panel icon (1.3.0)"
```

---

### Task 6: Manual end-to-end verification

**Files:** none (verification only)

This task replaces the absent JS test coverage with a documented manual run-through. Each sub-step must visibly pass before moving on.

- [ ] **Step 1: Install the modified extension**

```bash
bash scripts/install.sh
```

Expected output: ends with `Installation complete!`. The script recompiles the GSettings schema, so the new `icon-style` key becomes available.

- [ ] **Step 2: Reload GNOME Shell to pick up the new extension code**

- On Wayland: log out and back in.
- On X11: press `Alt+F2`, type `r`, press Enter.

After reload, the Claude Pulse panel item should still appear with its current (Pulse) icon — confirms baseline still works.

- [ ] **Step 3: Verify the default is still Pulse**

```bash
gsettings get org.gnome.shell.extensions.claude-pulse icon-style
```

Expected: `'pulse'`.
Panel icon should be identical to the pre-change version.

- [ ] **Step 4: Switch to the Claude Code logo via Preferences**

Open the extension preferences (GNOME Extensions app → Claude Pulse → settings cog, or run `gnome-extensions prefs claude-pulse@delfour.co`).

- Navigate to **Appearance**.
- Confirm a new **Panel icon** dropdown is present with two options.
- Select **Claude Code logo**.

Expected: the systray icon swaps instantly to the Claude Code mark. Since no Claude Code session is active, it should render in neutral gray (`#7d7d7d`).

- [ ] **Step 5: Verify the active state (orange)**

Start any Claude Code session that triggers the panel's existing agent/session counter (e.g. open a `claude` shell that runs through the hook pipeline).

Expected: the panel icon turns Anthropic orange (`#D97757`) within the next update cycle (≤ 5 seconds — the existing `_reloadFile` timer).

End the session.

Expected: the icon returns to neutral gray.

- [ ] **Step 6: Verify switching back to Pulse**

In Preferences → Appearance → Panel icon, select **Pulse (default)**.

Expected: the icon swaps back to the original Pulse mark. Starting a new Claude Code session does **not** recolor it — the Pulse icon retains its baked-in `#bebebe` regardless of activity.

- [ ] **Step 7: Verify persistence across logout**

Set the panel icon back to **Claude Code logo**, log out and log back in.

Expected: the Claude Code icon is shown after re-login (the GSettings value persists, and the constructor reads it at startup).

- [ ] **Step 8: Commit verification notes (optional)**

If anything in the steps above failed, do not move on — re-open the relevant task and fix. Otherwise this task is complete with no code change.

---

## Self-review summary

Each spec requirement maps to a task:

| Spec section | Task |
|---|---|
| Asset (SVG + license) | Task 1 |
| GSettings key | Task 2 |
| Extension behavior — constructor, color flip, runtime change | Task 3 (steps 1–5) |
| Preferences UI | Task 4 |
| README + CHANGELOG | Task 5 |
| Testing (manual checklist) | Task 6 |
| Packaging impact | None — no plan task needed (verified during Task 6 install run) |

No placeholders. All code blocks contain exact content. Type names used in Task 3 (`_applyIconStyle`, `_iconStyleChangedId`) match across steps. Hex values (`#7d7d7d`, `#D97757`) match the spec table.
