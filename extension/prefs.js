import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class ClaudePulsePreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        window.set_default_size(500, 700);
        const settings = this.getSettings();

        const page = new Adw.PreferencesPage({
            title: 'Claude Pulse',
            icon_name: 'utilities-terminal-symbolic',
        });
        window.add(page);

        // --- Appearance ---
        const appearGroup = new Adw.PreferencesGroup({
            title: 'Appearance',
        });
        page.add(appearGroup);

        const themeModel = new Gtk.StringList();
        themeModel.append('Default');
        themeModel.append('Compact');
        themeModel.append('Cyberpunk');
        themeModel.append('Tron');

        const themeKeys = ['default', 'compact', 'cyberpunk', 'tron'];
        const currentTheme = settings.get_string('theme');
        const currentIdx = themeKeys.indexOf(currentTheme);

        const themeRow = new Adw.ComboRow({
            title: 'Theme',
            subtitle: 'Visual style for the activity graph',
            model: themeModel,
            selected: currentIdx >= 0 ? currentIdx : 0,
        });
        themeRow.connect('notify::selected', () => {
            settings.set_string('theme', themeKeys[themeRow.selected]);
        });
        settings.connect('changed::theme', () => {
            themeRow.selected = themeKeys.indexOf(settings.get_string('theme'));
        });
        appearGroup.add(themeRow);

        // --- Notifications ---
        const notifGroup = new Adw.PreferencesGroup({
            title: 'Notifications',
            description: 'Choose which events trigger a desktop notification',
        });
        page.add(notifGroup);

        const notifs = [
            ['notify-agent-stop', 'Agent finished', 'When a subagent completes its work'],
            ['notify-agent-start', 'Agent started', 'When a new subagent is spawned'],
            ['notify-compact', 'Context compaction', 'When Claude Code compacts its context window'],
            ['notify-tool-error', 'Tool error', 'When a tool call fails (permission denied, etc.)'],
            ['notify-task-done', 'Task completed', 'When a task is marked as done'],
            ['notify-claude', 'Claude Code alerts', 'Relay Claude Code\'s own notifications (e.g. "waiting for input")'],
        ];

        for (const [key, title, subtitle] of notifs) {
            const row = new Adw.SwitchRow({title, subtitle});
            settings.bind(key, row, 'active', Gio.SettingsBindFlags.DEFAULT);
            notifGroup.add(row);
        }

        // --- Behavior ---
        const behaviorGroup = new Adw.PreferencesGroup({
            title: 'Behavior',
        });
        page.add(behaviorGroup);

        const dndRow = new Adw.SwitchRow({
            title: 'Auto Do Not Disturb',
            subtitle: 'Enable GNOME DND while agents are running',
        });
        settings.bind('auto-dnd', dndRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        behaviorGroup.add(dndRow);

        const soundRow = new Adw.SwitchRow({
            title: 'Sound on agent finish',
            subtitle: 'Play a system sound when an agent completes',
        });
        settings.bind('sound-on-finish', soundRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        behaviorGroup.add(soundRow);

        // --- Cleanup ---
        const cleanupGroup = new Adw.PreferencesGroup({
            title: 'Cleanup',
        });
        page.add(cleanupGroup);

        const staleRow = new Adw.SpinRow({
            title: 'Stale agent timeout',
            subtitle: 'Remove agents older than this (minutes). 0 = disabled.',
            adjustment: new Gtk.Adjustment({
                lower: 0, upper: 120,
                step_increment: 5, page_increment: 15,
                value: settings.get_int('stale-agent-timeout') / 60,
            }),
        });
        staleRow.adjustment.connect('value-changed', () => {
            settings.set_int('stale-agent-timeout', staleRow.adjustment.value * 60);
        });
        settings.connect('changed::stale-agent-timeout', () => {
            staleRow.adjustment.value = settings.get_int('stale-agent-timeout') / 60;
        });
        cleanupGroup.add(staleRow);

        const maxSizeRow = new Adw.SpinRow({
            title: 'Max events file size',
            subtitle: 'Truncate when idle and exceeding (KB). 0 = disabled.',
            adjustment: new Gtk.Adjustment({
                lower: 0, upper: 10240,
                step_increment: 50, page_increment: 100,
                value: settings.get_int('max-events-file-size') / 1024,
            }),
        });
        maxSizeRow.adjustment.connect('value-changed', () => {
            settings.set_int('max-events-file-size', maxSizeRow.adjustment.value * 1024);
        });
        settings.connect('changed::max-events-file-size', () => {
            maxSizeRow.adjustment.value = settings.get_int('max-events-file-size') / 1024;
        });
        cleanupGroup.add(maxSizeRow);
    }
}
