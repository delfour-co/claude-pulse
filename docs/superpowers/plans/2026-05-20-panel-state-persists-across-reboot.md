# Panel State Persists Across Reboot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop wiping the Claude Pulse events file at extension load time and let the existing replay + PID-reconciliation machinery rebuild the panel state across reboots and GNOME Shell restarts.

**Architecture:** Four small edits in `extension/extension.js` — remove the startup truncation, add an `_isInitialReplay` flag that suppresses desktop notifications on the first replay, trigger a `_reloadFile()` call at the end of `_init` so the panel populates immediately, and extend `_scanLiveSessions` to drop the in-memory metrics of sessions whose Claude Code PID is gone. The four edits are coupled — the spec presents them as a single atomic behavior change — so they ship in one commit. A CHANGELOG update under the existing 1.3.0 entry ships in a second.

**Tech Stack:** GJS / GNOME Shell 45–49 extension. No tests in CI for this surface; manual verification documented in the spec.

**Spec:** `docs/superpowers/specs/2026-05-20-panel-state-persists-across-reboot-design.md`

---

## File Structure

**Modify:**
- `extension/extension.js` — four locations: constructor (~line 614), end of `_init` (~lines 725–733 and after), `_reloadFile` (~lines 1099–1119), `_scanLiveSessions` (~lines 880–883).
- `CHANGELOG.md` — append a `### Fixes` subsection under the existing `## [1.3.0] - 2026-05-20` entry.

No new files.

---

### Task 1: Apply the four extension.js edits

**File:** `extension/extension.js`

The four edits are interdependent: dropping the truncation without the notification-suppression flag would spam users on login. Apply all four in the same commit.

- [ ] **Step 1: Read the file once to confirm anchor locations**

Run:

```bash
grep -n "Purge events file on startup" extension/extension.js
grep -n "this._history = \[\];" extension/extension.js
grep -n "Reset state and replay all events" extension/extension.js
grep -n "this._lastLineCount = lines.length;" extension/extension.js
grep -n "Remove sessions from JSONL that are no longer alive" extension/extension.js
```

Expected: each grep returns exactly one line number. The line numbers in this task are approximate — the anchors above are the reliable references.

- [ ] **Step 2: Initialize the `_isInitialReplay` flag in the constructor**

Find the line in the constructor that reads:

```javascript
        this._history = [];
```

(It's the last initialization statement before the "Panel layout" comment, around line 613.)

Insert this line **immediately after** it:

```javascript
        this._isInitialReplay = true;
```

- [ ] **Step 3: Remove the startup truncation block**

Find this block (around lines 725–733):

```javascript
        // Purge events file on startup to avoid stale sessions/agents
        try {
            if (this._monitorFile && this._monitorFile.query_exists(null)) {
                const stream = this._monitorFile.replace(null, false, Gio.FileCreateFlags.NONE, null);
                stream.close(null);
            }
        } catch (_e) {
            // Ignore
        }
        this._lastLineCount = 0;
```

Replace it with **only**:

```javascript
        this._lastLineCount = 0;
```

The `_lastLineCount = 0` line stays because it remains the correct initial value: on the first replay, `prevLineCount` is 0 so every existing line is processed (and, with the new flag, classified as not-new for notification purposes).

- [ ] **Step 4: Trigger an immediate replay at the end of `_init`**

Locate the end of the `_init` method. The last statements before the closing `}` of `_init` are the existing menu-open handler (the `this._menuOpenId = this.menu.connect('open-state-changed', ...)` block ending around line 769–770).

After that block, **before** the closing `}` of `_init`, insert:

```javascript

        // Replay any persisted events.jsonl content immediately so the panel
        // doesn't sit empty until the 5s reload timer fires.
        this._reloadFile();
```

- [ ] **Step 5: Gate notifications during the initial replay**

In `_reloadFile`, find this line (around line 1114):

```javascript
                    const isNew = i >= prevLineCount;
```

Replace with:

```javascript
                    const isNew = !this._isInitialReplay && (i >= prevLineCount);
```

Then, find the closing of the replay `for` loop. After `_scanLiveSessions()` is called and immediately before `this._updateMenu();` (around line 1123), insert:

```javascript
            this._isInitialReplay = false;
```

The flag is therefore true for exactly one execution of `_reloadFile` — the first one — and false thereafter. Live events that arrive afterward go through the regular `isNew = i >= prevLineCount` path.

- [ ] **Step 6: Drop metrics for dead sessions in `_scanLiveSessions`**

Find this loop at the end of `_scanLiveSessions` (around lines 880–883):

```javascript
        // Remove sessions from JSONL that are no longer alive
        for (const sid of jsonlSessionIds) {
            if (!liveSessions.has(sid))
                this._activeSessions.delete(sid);
        }
```

Replace with:

```javascript
        // Remove sessions from JSONL that are no longer alive, and drop their
        // accumulated metrics so the totals row stays consistent with the
        // SESSIONS list rendered just below.
        for (const sid of jsonlSessionIds) {
            if (!liveSessions.has(sid)) {
                this._activeSessions.delete(sid);
                this._sessionMetrics.delete(sid);
                this._sessionStarts.delete(sid);
            }
        }
```

- [ ] **Step 7: Confirm the edits landed**

```bash
grep -c "_isInitialReplay" extension/extension.js
grep -c "Purge events file on startup" extension/extension.js
grep -c "this._reloadFile();" extension/extension.js
grep -c "this._sessionMetrics.delete(sid);" extension/extension.js
```

Expected:
- `_isInitialReplay`: 3 (declaration, gating in `_reloadFile`, flip to false)
- `Purge events file on startup`: 0 (block removed)
- `this._reloadFile();`: at least 2 (the new explicit call + the existing call inside the file-monitor / timer callbacks). The exact count depends on the file but must be ≥ 2.
- `this._sessionMetrics.delete(sid);`: at least 2 (existing call in the `SessionEnd` case + the new one in `_scanLiveSessions`).

If any check fails, re-read the corresponding step before retrying.

- [ ] **Step 8: Commit**

```bash
git add extension/extension.js
git commit -m "extension: replay events.jsonl on load instead of truncating it"
```

---

### Task 2: Update CHANGELOG

**File:** `CHANGELOG.md`

- [ ] **Step 1: Locate the existing 1.3.0 entry**

```bash
grep -n "^## \[1\.3\.0\]" CHANGELOG.md
```

Expected: one line number (the existing 1.3.0 heading from the icon work).

- [ ] **Step 2: Append a `### Fixes` subsection inside that entry**

Read the existing `## [1.3.0] - 2026-05-20` block. It currently contains a `### Features` subsection (the optional icon entry) and a `### Credits` subsection.

Insert a new `### Fixes` subsection **between** `### Features` and `### Credits`, so the final ordering for 1.3.0 reads: Features → Fixes → Credits.

The block to insert:

```markdown
### Fixes

- **Panel state survives reboot and GNOME Shell restart** — The events file is no longer purged on extension load. The panel replays its history, reconciles active sessions via PID check, and drops accumulated metrics for sessions whose Claude Code process is no longer running. Tool counts, prompts, errors, and other per-session metrics now persist across login cycles the same way the session cost already did.

```

- [ ] **Step 3: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs: changelog entry for panel state persistence (1.3.0)"
```

---

### Task 3: Manual end-to-end verification

**Files:** none (verification only)

GNOME Shell extension code cannot be exercised by CI in this repo. The verification below substitutes for automated tests and must all pass before merge.

- [ ] **Step 1: Install the updated extension**

```bash
bash scripts/install.sh
```

Expected output ends with `Installation complete!`.

- [ ] **Step 2: Reload GNOME Shell**

- On Wayland: log out and log back in.
- On X11: `Alt+F2`, type `r`, press Enter.

After reload, the Claude Pulse panel item should reappear.

- [ ] **Step 3: Generate baseline activity**

Start a Claude Code session and perform several actions that produce events:

- Issue a few prompts.
- Make Claude call several tools (e.g. by asking it to read or edit a file, or run a small bash command).
- Optionally trigger a subagent (e.g. via the Task tool if it's available, or any tool that spawns one).

Open the Claude Pulse dropdown. Note the values shown:

- Per-session tool counts (Edit:N, Read:N, etc.) in the tool stats area.
- The cost line (`$X.XX` or `~$X.XX`).
- The session entry under SESSIONS with `prompts: N`.

Write these numbers down (or screenshot the dropdown).

- [ ] **Step 4: Verify state survives a logout/login cycle while the session is still alive**

Keep the Claude Code session running. Log out (or reboot, your call). Log back in.

Open the Claude Pulse dropdown again.

Expected:
- The same Claude Code session is still listed under SESSIONS.
- Tool counts match the values from Step 3 (potentially higher if Claude Code ran more activity between logout and login, but never lower).
- Cost matches.
- **No flood of desktop notifications** for the replayed events (the `_isInitialReplay` gate did its job).

If tool counts drop to zero or the session disappears, the truncation or replay is broken — STOP and investigate before proceeding.

- [ ] **Step 5: Verify dead session cleanup**

End the Claude Code session entirely (`/exit` inside the CLI, or close the terminal).

Wait a few seconds for the file monitor / 5s reload timer to fire (or click anywhere on the panel icon to force a menu open, which triggers an update).

Expected:
- The SESSIONS list no longer shows the now-dead session.
- The metrics bar totals (tools, errors, prompts, cost) drop to zero — they no longer count the zombie session.
- The session moves to `_sessionHistory` only if a clean `SessionEnd` event was emitted; otherwise it just disappears, which is the correct behavior for an abrupt termination.

- [ ] **Step 6: Verify the cycle from a clean state**

Logout/login one more time with no Claude Code session running.

Expected:
- Claude Pulse panel reloads.
- SESSIONS is empty, metrics are zero.
- No notifications fired during replay.

- [ ] **Step 7: If any step failed**

Do not mark this task complete. Re-open Task 1 or Task 2 as appropriate, identify the failure, and re-test.

---

## Self-review summary

| Spec section | Task |
|---|---|
| Remove startup truncation | Task 1 Step 3 |
| `_isInitialReplay` flag declared in constructor | Task 1 Step 2 |
| `_isInitialReplay` gate in `_reloadFile` + flip to false after replay | Task 1 Step 5 |
| Immediate replay at end of `_init` | Task 1 Step 4 |
| Drop metrics for dead sessions in `_scanLiveSessions` | Task 1 Step 6 |
| CHANGELOG entry under 1.3.0 / Fixes | Task 2 |
| Manual verification | Task 3 |
| Open questions: none | n/a |

No placeholders. All anchor blocks are quoted verbatim from the current state of the file at the time of writing. Method names used in the plan (`_init`, `_reloadFile`, `_scanLiveSessions`, `_sessionMetrics`, `_sessionStarts`, `_activeSessions`, `_updateMenu`) all exist in the codebase.
