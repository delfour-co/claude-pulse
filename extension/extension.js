import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import St from 'gi://St';

import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

// --- Helpers ---

function projectName(path) {
    let clean = path;
    const worktreeIdx = path.indexOf('/.claude/worktrees/');
    if (worktreeIdx !== -1) {
        clean = path.substring(0, worktreeIdx);
    } else {
        const claudeIdx = path.indexOf('/.claude/');
        if (claudeIdx !== -1)
            clean = path.substring(0, claudeIdx);
    }
    const parts = clean.split('/').filter(p => p.length > 0);
    return parts.length > 0 ? parts[parts.length - 1] : clean;
}

function formatDuration(startTimestamp) {
    const startMs = new Date(startTimestamp).getTime();
    const nowMs = Date.now();
    const diffSecs = Math.max(0, Math.floor((nowMs - startMs) / 1000));
    const mins = Math.floor(diffSecs / 60);
    const secs = diffSecs % 60;
    return `${mins}m${String(secs).padStart(2, '0')}s`;
}

// --- Panel Button ---

const ClaudePulseButton = GObject.registerClass({
    GTypeName: 'ClaudePulseButton',
}, class ClaudePulseButton extends PanelMenu.Button {
    _init() {
        super._init(0.0, 'Claude Pulse', false);

        this._activeAgents = new Map();
        this._activeSessions = new Map();
        this._fileMonitor = null;
        this._fileMonitorId = 0;
        this._tickTimerId = null;

        // Panel layout: icon + label
        this._box = new St.BoxLayout({style_class: 'panel-status-indicators-box'});

        this._icon = new St.Icon({
            icon_name: 'utilities-terminal-symbolic',
            style_class: 'system-status-icon',
        });
        this._box.add_child(this._icon);

        this._label = new St.Label({
            text: 'idle',
            style_class: 'claude-panel-label',
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._box.add_child(this._label);

        this.add_child(this._box);

        // Menu sections
        this._headerItem = new PopupMenu.PopupMenuItem('Claude Pulse — idle', {reactive: false});
        this._headerItem.label.style_class = 'claude-header-label';
        this.menu.addMenuItem(this._headerItem);
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        this._agentSection = new PopupMenu.PopupMenuSection();
        this.menu.addMenuItem(this._agentSection);

        this._sessionSeparator = new PopupMenu.PopupSeparatorMenuItem();
        this.menu.addMenuItem(this._sessionSeparator);

        this._sessionSection = new PopupMenu.PopupMenuSection();
        this.menu.addMenuItem(this._sessionSection);

        // No agents placeholder
        const noAgents = new PopupMenu.PopupMenuItem('No active agents', {reactive: false});
        noAgents.label.style_class = 'claude-no-agents';
        this._agentSection.addMenuItem(noAgents);

        this._setupFileMonitor();
        this._reloadFile();

        // Tick timer to refresh durations every 2 seconds
        this._tickTimerId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 2, () => {
            if (this.menu.isOpen)
                this._updateMenu();
            return GLib.SOURCE_CONTINUE;
        });

        this._menuOpenId = this.menu.connect('open-state-changed', (_menu, isOpen) => {
            if (isOpen)
                this._updateMenu();
        });
    }

    _getMonitorFilePath() {
        const dataDir = GLib.get_user_data_dir();
        return GLib.build_filenamev([dataDir, 'claude-pulse', 'events.jsonl']);
    }

    _setupFileMonitor() {
        try {
            const path = this._getMonitorFilePath();
            const file = Gio.File.new_for_path(path);

            const parent = file.get_parent();
            if (parent && !parent.query_exists(null))
                parent.make_directory_with_parents(null);

            if (!file.query_exists(null))
                file.create(Gio.FileCreateFlags.NONE, null);

            this._monitorFile = file;
            this._fileMonitor = file.monitor_file(Gio.FileMonitorFlags.NONE, null);
            this._fileMonitorId = this._fileMonitor.connect('changed',
                (_monitor, _changedFile, _otherFile, eventType) => {
                    if (eventType === Gio.FileMonitorEvent.CHANGED ||
                        eventType === Gio.FileMonitorEvent.CHANGES_DONE_HINT) {
                        this._reloadFile();
                    }
                });
        } catch (e) {
            console.error(`[ClaudePulse] File monitor setup failed: ${e.message}`);
        }
    }

    _reloadFile() {
        try {
            if (!this._monitorFile || !this._monitorFile.query_exists(null))
                return;

            const [ok, contents] = this._monitorFile.load_contents(null);
            if (!ok) return;

            const text = new TextDecoder('utf-8').decode(contents);
            const lines = text.trim().split('\n').filter(l => l.length > 0);

            const previousAgentIds = new Set(this._activeAgents.keys());

            this._activeAgents.clear();
            this._activeSessions.clear();

            for (const line of lines) {
                try {
                    const ev = JSON.parse(line);
                    switch (ev.event) {
                        case 'SubagentStart':
                            this._activeAgents.set(ev.agent_id, ev);
                            break;
                        case 'SubagentStop':
                            this._activeAgents.delete(ev.agent_id);
                            if (previousAgentIds.has(ev.agent_id))
                                this._notifyAgentStopped(ev);
                            break;
                        case 'SessionStart':
                            this._activeSessions.set(ev.session_id, ev);
                            break;
                        case 'SessionEnd':
                            this._activeSessions.delete(ev.session_id);
                            for (const [agentId, agent] of this._activeAgents) {
                                if (agent.session_id === ev.session_id)
                                    this._activeAgents.delete(agentId);
                            }
                            break;
                    }
                } catch (_e) {
                    // Skip malformed lines
                }
            }

            this._updateMenu();
        } catch (e) {
            console.error(`[ClaudePulse] Reload failed: ${e.message}`);
        }
    }

    _updateMenu() {
        const agentCount = this._activeAgents.size;
        const sessionCount = this._activeSessions.size;

        // Update panel label
        if (agentCount === 0)
            this._label.text = 'idle';
        else if (agentCount === 1)
            this._label.text = '1 agent';
        else
            this._label.text = `${agentCount} agents`;
        this._label.style_class = agentCount > 0
            ? 'claude-panel-label-active'
            : 'claude-panel-label';

        // Update header
        if (agentCount === 0)
            this._headerItem.label.text = 'Claude Pulse — idle';
        else if (agentCount === 1)
            this._headerItem.label.text = 'Claude Pulse — 1 agent';
        else
            this._headerItem.label.text = `Claude Pulse — ${agentCount} agents`;

        // Rebuild agent section
        this._agentSection.removeAll();

        if (agentCount === 0) {
            const item = new PopupMenu.PopupMenuItem('No active agents', {reactive: false});
            item.label.style_class = 'claude-no-agents';
            this._agentSection.addMenuItem(item);
        } else {
            const agents = [...this._activeAgents.values()];
            agents.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

            for (const agent of agents) {
                const project = projectName(agent.cwd);
                const duration = formatDuration(agent.timestamp);
                const profileTag = (agent.profile && agent.profile !== 'default')
                    ? ` [${agent.profile}]`
                    : '';

                const label = `● ${agent.agent_type} — ${project} (${duration})${profileTag}`;
                const item = new PopupMenu.PopupMenuItem(label, {reactive: false});
                this._agentSection.addMenuItem(item);
            }
        }

        // Rebuild session section
        this._sessionSection.removeAll();

        if (sessionCount > 0) {
            this._sessionSeparator.visible = true;
            const sessionLabel = sessionCount === 1
                ? '1 active session'
                : `${sessionCount} active sessions`;
            const item = new PopupMenu.PopupMenuItem(sessionLabel, {reactive: false});
            item.label.style_class = 'claude-no-agents';
            this._sessionSection.addMenuItem(item);
        } else {
            this._sessionSeparator.visible = false;
        }
    }

    _notifyAgentStopped(ev) {
        try {
            const project = projectName(ev.cwd || '');
            const profileTag = (ev.profile && ev.profile !== 'default')
                ? ` [${ev.profile}]`
                : '';
            const body = `${ev.agent_type} — ${project}${profileTag}`;
            Main.notify('Claude Pulse', body);
        } catch (e) {
            console.error(`[ClaudePulse] Notification failed: ${e.message}`);
        }
    }

    destroy() {
        if (this._tickTimerId) {
            GLib.Source.remove(this._tickTimerId);
            this._tickTimerId = null;
        }

        if (this._menuOpenId) {
            this.menu.disconnect(this._menuOpenId);
            this._menuOpenId = null;
        }

        if (this._fileMonitor) {
            this._fileMonitor.disconnect(this._fileMonitorId);
            this._fileMonitor.cancel();
            this._fileMonitor = null;
        }

        super.destroy();
    }
});

// --- Extension entry point ---

let pulseButton = null;

export default class ClaudePulseExtension extends Extension {
    enable() {
        pulseButton = new ClaudePulseButton();
        Main.panel.addToStatusArea(this.uuid, pulseButton);
    }

    disable() {
        pulseButton?.destroy();
        pulseButton = null;
    }
}
