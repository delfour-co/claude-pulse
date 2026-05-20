# Panel state survives reboot — design spec

**Date:** 2026-05-20
**Status:** Approved (brainstorm validated by maintainer)
**Scope:** Single GNOME-extension behavior change. No new GSettings keys, no hook changes.

## Goal

After a reboot, GNOME Shell restart, or any other event that reloads
the Claude Pulse extension, the panel should reconstruct its state
(tool counts, prompt counts, errors, costs, live sessions, etc.) from
the persisted `events.jsonl` and the currently-running Claude Code
processes — instead of starting empty as it does today.

## Why

`compute-cost.sh` reads the full Claude Code transcript JSONL on every
`PostToolUse`/`Stop`, so the **cost** shown in the panel survives a
reboot intact. Everything else (tools, errors, prompts, active agents)
is fed from Claude Pulse's own `events.jsonl`, which is explicitly
truncated at extension load time (`extension.js:725–733`). The two
sources end up wildly out of sync — the panel shows e.g. `$14.41` next
to an empty tool stats area, suggesting (incorrectly) that nothing has
happened in the session. The truncation exists to avoid resurrecting
zombie sessions/agents from before reboot; the fix below preserves
that protection while keeping the history.

## Non-goals

- New GSettings key. The behavior change is unconditional — there is
  no opt-out.
- Filtering events by age. The existing `_maybeRotateEventsFile`
  rotation (fires when idle and the file exceeds `max-events-file-size`)
  is the only mechanism that bounds the file's growth, and it stays
  unchanged.
- A separate "since panel load" vs "lifetime" view. Once the panel is
  consistent with the cost, the distinction is no longer needed.
- Automated tests. The change touches GNOME Shell extension code with
  no JS runtime in CI. Manual verification is documented below.

## Changes to `extension/extension.js`

### 1. Remove the startup truncation

Delete the block that overwrites `events.jsonl` at the end of `_init`:

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

Keep only the `this._lastLineCount = 0;` line — it remains the correct
initial value so that the first `_reloadFile()` call treats every
existing line as a new replay event.

### 2. Suppress notifications during the initial replay

The notification gating in `_reloadFile` uses `isNew = i >= prevLineCount`
to decide whether to fire desktop notifications for each event. On the
first reload after a panel restart, `prevLineCount` is `0`, so every
historical event would be classed as "new" and would re-trigger
notifications (agent started, compaction, tool error, task done,
Claude relay) for events that fired hours or days earlier.

Add an instance flag in the constructor:

```javascript
this._isInitialReplay = true;
```

Inside `_reloadFile`, override `isNew` while the flag is set:

```javascript
const isNew = !this._isInitialReplay && (i >= prevLineCount);
```

Flip the flag to `false` at the end of `_reloadFile`, after the
replay loop and `_scanLiveSessions()` have run:

```javascript
this._isInitialReplay = false;
```

### 3. Trigger an immediate replay at the end of `_init`

Today the panel waits up to 5 seconds for the `_reloadTimerId` to fire
before it has any state. After the truncation is removed, that delay
becomes visible — for those 5 seconds the panel will look the same as
the pre-fix behavior. Call `_reloadFile()` explicitly at the end of
`_init`, after `_setupFileMonitor()` and after the reload timer is
armed.

### 4. Drop metrics for dead sessions

In `_scanLiveSessions`, the existing loop at lines 880–883 removes a
dead session from `this._activeSessions` when its PID is no longer
alive. Extend the same loop to also clear its accumulator state:

```javascript
for (const sid of jsonlSessionIds) {
    if (!liveSessions.has(sid)) {
        this._activeSessions.delete(sid);
        this._sessionMetrics.delete(sid);
        this._sessionStarts.delete(sid);
    }
}
```

Without this, the metrics aggregation loop in `_updateMenu`
(lines ~1147–1160) would still sum tools / errors / prompts / cost from
the zombie session, inflating the totals shown in the metrics bar.
With this, the totals match the SESSIONS list directly underneath.

## What stays the same

- The hook script and `compute-cost.sh` are unchanged.
- `_maybeRotateEventsFile` continues to rotate the events file when
  idle and oversized. With no startup truncation, this becomes the
  primary cleanup mechanism; it is already in place and correct.
- `_cleanupStaleAgents` continues to age out idle subagents based on
  `stale-agent-timeout` (default 30 minutes).
- The `_processEvent` switch is untouched. All existing event types
  replay through the same paths they already use.

## Edge cases

- **Empty `events.jsonl` on startup**: `_reloadFile` reads zero lines,
  replays nothing, the panel stays empty until the first hook fires.
  Same as today.
- **Corrupt JSONL lines**: ignored by the existing try/catch in the
  replay loop (line 1116). Same as today.
- **Resumed session reusing the same `session_id`**: `_scanLiveSessions`
  finds the PID alive and keeps the session. Pre-reboot metrics
  aggregate naturally with new events. Tool counts, prompts, cost grow
  continuously, exactly as the user would expect.
- **Resumed session with a new `session_id`**: the old session's PID is
  dead, so `_scanLiveSessions` prunes it (and now its metrics too).
  The new session starts with its own clean metrics. Lifetime cost
  shown in the panel switches to reflect only the new transcript.
- **Stale sessions whose Claude Code process is dead but were never
  cleaned**: same as above — pruned by PID check, metrics dropped.

## CHANGELOG

Fold under the existing `## [1.3.0] - 2026-05-20` entry on the
`feat/claudecode-panel-icon` branch, in a new `### Fixes` subsection:

> **Panel state survives reboot and GNOME Shell restart** — The
> events file is no longer purged on extension load. The panel
> replays its history, reconciles active sessions via PID check, and
> drops accumulated metrics for sessions whose Claude Code process is
> no longer running. Tool counts, prompts, errors, and other
> per-session metrics now persist across login cycles the same way
> the session cost already did.

## Manual verification

1. Start a Claude Code session, perform several tool calls (Read,
   Edit, Bash, etc.), submit a prompt or two.
2. Logout (Wayland) or restart GNOME Shell (X11). The panel reloads.
3. Open the Claude Pulse dropdown. The tool stats area should show
   the tool counts from step 1. The metrics bar should show the same
   cost it showed before the restart, with the same per-session
   breakdown.
4. Close the Claude Code session entirely (Ctrl-D / `/exit`).
5. Logout/login again. The Claude Pulse dropdown should now show no
   active sessions (the PID is gone). The metrics bar totals should
   be zero (the dead session's metrics were dropped by
   `_scanLiveSessions`).
6. During step 2's login, no desktop notifications should fire for
   the historical events being replayed.

## Open questions

None.
