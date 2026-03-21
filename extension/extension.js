import Cairo from 'gi://cairo';
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import St from 'gi://St';

import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

// --- Constants ---

const HISTORY_SIZE = 60;
const SAMPLE_INTERVAL_S = 10;
const STALE_CHECK_INTERVAL_S = 60;
const MAX_SESSION_HISTORY = 10;

// --- Themes ---

const THEMES = {
    default: {
        graphHeight: 80,
        toolsGraphHeight: 80,
        glowRadius: 10,
        lineWidth: 2.5,
        glowWidth: 6,
        iconColor: '#6cc',
        sessionIconColor: '#8be9fd',
        toolColors: {
            Bash:  [0.40, 0.80, 0.40, 0.70],
            Read:  [0.30, 0.65, 1.00, 0.70],
            Edit:  [1.00, 0.75, 0.20, 0.70],
            Write: [0.90, 0.50, 0.20, 0.70],
            Grep:  [0.65, 0.50, 1.00, 0.70],
            Glob:  [0.50, 0.85, 0.85, 0.70],
            Agent: [0.85, 0.40, 0.70, 0.70],
            err:   [1.00, 0.30, 0.30, 0.90],
        },
        bg:       [0.06, 0.06, 0.10, 0.95],
        border:   [0.20, 0.30, 0.50, 0.25],
        grid:     [0.20, 0.30, 0.50, 0.12],
        axis:     [0.20, 0.30, 0.50, 0.20],
        fillTop:  [0.20, 0.60, 1.00, 0.40],
        fillMid:  [0.20, 0.50, 0.90, 0.12],
        fillBot:  [0.20, 0.40, 0.80, 0.01],
        glow:     [0.30, 0.60, 1.00, 0.25],
        lineL:    [0.20, 0.50, 0.90, 0.30],
        lineM:    [0.30, 0.70, 1.00, 0.95],
        lineR:    [0.50, 0.85, 1.00, 1.00],
        dot:      [0.50, 0.85, 1.00, 1.00],
        dotCore:  [1.00, 1.00, 1.00, 0.95],
        label:    [0.40, 0.45, 0.55, 0.55],
        accent:   [0.50, 0.85, 1.00, 0.85],
        metrics:  [0.40, 0.50, 0.65, 0.50],
        text:     [0.40, 0.45, 0.55, 0.50],
    },
    compact: {
        graphHeight: 55,
        toolsGraphHeight: 55,
        glowRadius: 6,
        lineWidth: 2,
        glowWidth: 4,
        iconColor: '#7aabb8',
        sessionIconColor: '#7aabb8',
        toolColors: {
            Bash:  [0.40, 0.75, 0.40, 0.55],
            Read:  [0.30, 0.60, 0.95, 0.55],
            Edit:  [0.95, 0.70, 0.20, 0.55],
            Write: [0.85, 0.50, 0.20, 0.55],
            Grep:  [0.60, 0.45, 0.95, 0.55],
            Glob:  [0.50, 0.80, 0.80, 0.55],
            Agent: [0.80, 0.40, 0.65, 0.55],
            err:   [1.00, 0.30, 0.30, 0.75],
        },
        bg:       [0.08, 0.08, 0.12, 0.95],
        border:   [0.22, 0.22, 0.30, 0.20],
        grid:     [0.22, 0.22, 0.30, 0.10],
        axis:     [0.22, 0.22, 0.30, 0.15],
        fillTop:  [0.35, 0.65, 0.95, 0.25],
        fillMid:  [0.35, 0.55, 0.85, 0.06],
        fillBot:  [0.35, 0.50, 0.80, 0.01],
        glow:     [0.35, 0.60, 0.90, 0.15],
        lineL:    [0.35, 0.55, 0.85, 0.25],
        lineM:    [0.35, 0.65, 0.95, 0.75],
        lineR:    [0.45, 0.75, 0.95, 0.90],
        dot:      [0.45, 0.75, 0.95, 1.00],
        dotCore:  [1.00, 1.00, 1.00, 0.80],
        label:    [0.45, 0.45, 0.55, 0.45],
        accent:   [0.45, 0.75, 0.95, 0.70],
        metrics:  [0.45, 0.45, 0.55, 0.40],
        text:     [0.45, 0.45, 0.55, 0.40],
    },
    cyberpunk: {
        graphHeight: 80,
        toolsGraphHeight: 80,
        glowRadius: 14,
        lineWidth: 2.5,
        glowWidth: 8,
        iconColor: '#0ff',
        sessionIconColor: '#ff69b4',
        toolColors: {
            Bash:  [0.00, 1.00, 0.40, 0.80],
            Read:  [0.00, 1.00, 1.00, 0.80],
            Edit:  [1.00, 1.00, 0.00, 0.80],
            Write: [1.00, 0.50, 0.00, 0.80],
            Grep:  [0.80, 0.00, 1.00, 0.80],
            Glob:  [0.00, 0.80, 1.00, 0.80],
            Agent: [1.00, 0.00, 0.80, 0.80],
            err:   [1.00, 0.00, 0.20, 1.00],
        },
        bg:       [0.04, 0.01, 0.08, 0.97],
        border:   [1.00, 0.00, 0.60, 0.35],
        grid:     [1.00, 0.00, 0.60, 0.08],
        axis:     [1.00, 0.00, 0.60, 0.20],
        fillTop:  [1.00, 0.00, 0.80, 0.35],
        fillMid:  [0.80, 0.00, 0.60, 0.10],
        fillBot:  [0.60, 0.00, 0.40, 0.01],
        glow:     [1.00, 0.00, 0.80, 0.30],
        lineL:    [0.00, 1.00, 1.00, 0.40],
        lineM:    [1.00, 0.00, 0.80, 0.95],
        lineR:    [1.00, 1.00, 0.00, 1.00],
        dot:      [1.00, 1.00, 0.00, 1.00],
        dotCore:  [1.00, 1.00, 1.00, 1.00],
        label:    [0.00, 1.00, 1.00, 0.50],
        accent:   [1.00, 1.00, 0.00, 0.90],
        metrics:  [0.00, 1.00, 1.00, 0.40],
        text:     [1.00, 0.00, 0.60, 0.40],
    },
    tron: {
        graphHeight: 80,
        toolsGraphHeight: 80,
        glowRadius: 12,
        lineWidth: 2.5,
        glowWidth: 7,
        iconColor: '#0af',
        sessionIconColor: '#ffa31a',
        toolColors: {
            Bash:  [0.00, 0.80, 0.40, 0.70],
            Read:  [0.00, 0.60, 1.00, 0.70],
            Edit:  [1.00, 0.65, 0.10, 0.70],
            Write: [1.00, 0.45, 0.00, 0.70],
            Grep:  [0.50, 0.40, 1.00, 0.70],
            Glob:  [0.00, 0.80, 0.80, 0.70],
            Agent: [1.00, 0.50, 0.00, 0.70],
            err:   [1.00, 0.20, 0.10, 0.90],
        },
        bg:       [0.01, 0.02, 0.06, 0.97],
        border:   [0.00, 0.55, 0.85, 0.30],
        grid:     [0.00, 0.40, 0.65, 0.08],
        axis:     [0.00, 0.45, 0.70, 0.18],
        fillTop:  [1.00, 0.45, 0.00, 0.35],
        fillMid:  [1.00, 0.35, 0.00, 0.10],
        fillBot:  [1.00, 0.25, 0.00, 0.01],
        glow:     [1.00, 0.45, 0.00, 0.28],
        lineL:    [0.00, 0.55, 0.85, 0.30],
        lineM:    [1.00, 0.50, 0.00, 0.95],
        lineR:    [1.00, 0.65, 0.10, 1.00],
        dot:      [1.00, 0.65, 0.10, 1.00],
        dotCore:  [1.00, 1.00, 1.00, 1.00],
        label:    [0.00, 0.55, 0.85, 0.50],
        accent:   [1.00, 0.65, 0.10, 0.90],
        metrics:  [0.00, 0.55, 0.85, 0.40],
        text:     [0.00, 0.45, 0.70, 0.40],
    },
};

// --- Helpers ---

function projectName(path) {
    let clean = path;
    const worktreeIdx = path.indexOf('/.claude/worktrees/');
    if (worktreeIdx !== -1)
        clean = path.substring(0, worktreeIdx);
    else {
        const claudeIdx = path.indexOf('/.claude/');
        if (claudeIdx !== -1)
            clean = path.substring(0, claudeIdx);
    }
    const parts = clean.split('/').filter(p => p.length > 0);
    return parts.length > 0 ? parts[parts.length - 1] : clean;
}

function formatDuration(startTimestamp, endTimestamp) {
    const startMs = new Date(startTimestamp).getTime();
    const endMs = endTimestamp ? new Date(endTimestamp).getTime() : Date.now();
    const diffSecs = Math.max(0, Math.floor((endMs - startMs) / 1000));
    const mins = Math.floor(diffSecs / 60);
    const secs = diffSecs % 60;
    return `${mins}m${String(secs).padStart(2, '0')}s`;
}

function truncate(str, maxLen) {
    if (!str) return '';
    const clean = str.replace(/\n/g, ' ').trim();
    return clean.length > maxLen ? `${clean.substring(0, maxLen)}…` : clean;
}

// --- Activity Graph (Cairo) ---

const ActivityGraph = GObject.registerClass(
class ActivityGraph extends St.DrawingArea {
    _init(history) {
        super._init({
            x_expand: true,
            style: 'margin: 4px 0;',
        });
        this._history = history;
        this._metricsText = '';
        this._theme = THEMES.default;
        this.height = this._theme.graphHeight;
    }

    setMetrics(text) {
        this._metricsText = text;
    }

    setTheme(theme) {
        this._theme = theme;
        this.height = theme.graphHeight;
    }

    _smoothPoints(hist, pad, gw, gh, max) {
        const pts = hist.map((v, i) => ({
            x: pad.left + (i / (hist.length - 1)) * gw,
            y: pad.top + gh - (v / max) * gh,
        }));
        if (pts.length < 3) return pts;

        const smooth = [];
        for (let i = 0; i < pts.length - 1; i++) {
            const p0 = pts[Math.max(i - 1, 0)];
            const p1 = pts[i];
            const p2 = pts[i + 1];
            const p3 = pts[Math.min(i + 2, pts.length - 1)];

            for (let t = 0; t <= 1; t += 0.1) {
                const t2 = t * t;
                const t3 = t2 * t;
                smooth.push({
                    x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t +
                        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
                        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
                    y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t +
                        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
                        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
                });
            }
        }
        smooth.push(pts[pts.length - 1]);
        return smooth;
    }

    vfunc_repaint() {
        const cr = this.get_context();
        const t = this._theme;
        const [w, h] = [this.width || 300, t.graphHeight];
        const hist = this._history;
        const max = Math.max(...hist, 1);
        const pad = {top: 12, bottom: 14, left: 20, right: 6};
        const gw = w - pad.left - pad.right;
        const gh = h - pad.top - pad.bottom;

        // Background
        cr.setSourceRGBA(...t.bg);
        this._roundedRect(cr, 0, 0, w, h, 6);
        cr.fill();

        // Border glow (subtle outer border with theme accent)
        cr.setSourceRGBA(...t.border);
        cr.setLineWidth(1);
        this._roundedRect(cr, 0.5, 0.5, w - 1, h - 1, 6);
        cr.stroke();

        // Grid
        cr.setSourceRGBA(...t.grid);
        cr.setLineWidth(0.5);
        cr.setDash([2, 4], 0);
        for (let i = 1; i <= Math.min(max, 4); i++) {
            const y = pad.top + gh - (i / max) * gh;
            cr.moveTo(pad.left, y);
            cr.lineTo(w - pad.right, y);
            cr.stroke();
        }
        cr.setDash([], 0);

        // Axis
        cr.setSourceRGBA(...t.axis);
        cr.setLineWidth(0.5);
        cr.moveTo(pad.left, pad.top + gh);
        cr.lineTo(w - pad.right, pad.top + gh);
        cr.stroke();

        if (hist.length < 2) {
            cr.setSourceRGBA(...t.text);
            cr.setFontSize(9);
            cr.moveTo(w / 2 - 25, h / 2 + 3);
            cr.showText('Collecting...');
            cr.$dispose();
            return;
        }

        const smooth = this._smoothPoints(hist, pad, gw, gh, max);

        // Fill gradient
        const gradient = new Cairo.LinearGradient(0, pad.top, 0, pad.top + gh);
        gradient.addColorStopRGBA(0, ...t.fillTop);
        gradient.addColorStopRGBA(0.4, ...t.fillMid);
        gradient.addColorStopRGBA(1, ...t.fillBot);
        cr.setSource(gradient);
        cr.moveTo(pad.left, pad.top + gh);
        for (const pt of smooth) cr.lineTo(pt.x, pt.y);
        cr.lineTo(smooth[smooth.length - 1].x, pad.top + gh);
        cr.closePath();
        cr.fill();

        // Outer glow (wide, soft)
        cr.setSourceRGBA(...t.glow);
        cr.setLineWidth(t.glowWidth);
        cr.setLineJoin(Cairo.LineJoin.ROUND);
        cr.setLineCap(Cairo.LineCap.ROUND);
        cr.moveTo(smooth[0].x, smooth[0].y);
        for (let i = 1; i < smooth.length; i++) cr.lineTo(smooth[i].x, smooth[i].y);
        cr.stroke();

        // Main line with gradient
        const lineGrad = new Cairo.LinearGradient(pad.left, 0, w - pad.right, 0);
        lineGrad.addColorStopRGBA(0, ...t.lineL);
        lineGrad.addColorStopRGBA(0.6, ...t.lineM);
        lineGrad.addColorStopRGBA(1, ...t.lineR);
        cr.setSource(lineGrad);
        cr.setLineWidth(t.lineWidth);
        cr.setLineJoin(Cairo.LineJoin.ROUND);
        cr.setLineCap(Cairo.LineCap.ROUND);
        cr.moveTo(smooth[0].x, smooth[0].y);
        for (let i = 1; i < smooth.length; i++) cr.lineTo(smooth[i].x, smooth[i].y);
        cr.stroke();

        // Dot — outer halo
        const lastVal = hist[hist.length - 1];
        const cx = smooth[smooth.length - 1].x;
        const cy = smooth[smooth.length - 1].y;

        const halo = new Cairo.RadialGradient(cx, cy, 0, cx, cy, t.glowRadius);
        halo.addColorStopRGBA(0, t.dot[0], t.dot[1], t.dot[2], 0.5);
        halo.addColorStopRGBA(0.5, t.dot[0], t.dot[1], t.dot[2], 0.15);
        halo.addColorStopRGBA(1, t.dot[0], t.dot[1], t.dot[2], 0);
        cr.setSource(halo);
        cr.arc(cx, cy, t.glowRadius, 0, 2 * Math.PI);
        cr.fill();

        // Dot — ring
        cr.setSourceRGBA(...t.dot);
        cr.arc(cx, cy, 3.5, 0, 2 * Math.PI);
        cr.fill();

        // Dot — core
        cr.setSourceRGBA(...t.dotCore);
        cr.arc(cx, cy, 1.5, 0, 2 * Math.PI);
        cr.fill();

        // Labels — compact
        cr.setSourceRGBA(...t.label);
        cr.setFontSize(7);
        cr.moveTo(2, pad.top + 6);
        cr.showText(`${max}`);
        cr.moveTo(2, pad.top + gh - 1);
        cr.showText('0');

        const wm = Math.floor(hist.length * SAMPLE_INTERVAL_S / 60);
        cr.moveTo(pad.left, h - 3);
        cr.showText(`-${wm}m`);

        cr.setSourceRGBA(...t.accent);
        cr.moveTo(w - pad.right - 14, h - 3);
        cr.showText('now');

        // Active count (top right)
        cr.setSourceRGBA(...t.accent);
        cr.setFontSize(8);
        cr.moveTo(w - pad.right - 36, 9);
        cr.showText(`${lastVal} active`);

        cr.$dispose();
    }

    _roundedRect(cr, x, y, w, h, r) {
        cr.newSubPath();
        cr.arc(x + w - r, y + r, r, -Math.PI / 2, 0);
        cr.arc(x + w - r, y + h - r, r, 0, Math.PI / 2);
        cr.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
        cr.arc(x + r, y + r, r, Math.PI, 3 * Math.PI / 2);
        cr.closePath();
    }
});

// --- Tools Stacked Area Graph (Cairo) ---

const TOOL_NAMES = ['Bash', 'Read', 'Edit', 'Write', 'Grep', 'Glob', 'Agent'];
const TOOLS_HISTORY_SIZE = 30;

const ToolsGraph = GObject.registerClass(
class ToolsGraph extends St.DrawingArea {
    _init() {
        super._init({
            x_expand: true,
            style: 'margin: 2px 0;',
        });
        this._theme = THEMES.default;
        this.height = this._theme.toolsGraphHeight;
        // Each entry: {Bash: N, Read: N, Edit: N, ..., err: N}
        this._history = [];
    }

    setTheme(theme) {
        this._theme = theme;
        this.height = theme.toolsGraphHeight;
    }

    recordSnapshot(toolCounts, errorCount) {
        const snapshot = {};
        for (const t of TOOL_NAMES)
            snapshot[t] = toolCounts[t] || 0;
        snapshot.err = errorCount;
        this._history.push(snapshot);
        if (this._history.length > TOOLS_HISTORY_SIZE)
            this._history.shift();
    }

    vfunc_repaint() {
        const cr = this.get_context();
        const t = this._theme;
        const [w, h] = [this.width || 300, t.toolsGraphHeight];
        const pad = {top: 4, bottom: 14, left: 6, right: 6};
        const gw = w - pad.left - pad.right;
        const gh = h - pad.top - pad.bottom;
        const hist = this._history;
        const colors = t.toolColors;

        // Background
        cr.setSourceRGBA(...t.bg);
        this._roundedRect(cr, 0, 0, w, h, 6);
        cr.fill();

        cr.setSourceRGBA(...t.border);
        cr.setLineWidth(0.5);
        this._roundedRect(cr, 0.5, 0.5, w - 1, h - 1, 6);
        cr.stroke();

        if (hist.length < 2) {
            cr.$dispose();
            return;
        }

        // Compute per-interval deltas
        const deltas = [];
        for (let i = 1; i < hist.length; i++) {
            const d = {};
            for (const tool of [...TOOL_NAMES, 'err'])
                d[tool] = Math.max(0, (hist[i][tool] || 0) - (hist[i - 1][tool] || 0));
            deltas.push(d);
        }

        // Find max single-tool value for scaling (not stacked)
        let maxVal = 1;
        for (const d of deltas) {
            for (const tool of [...TOOL_NAMES, 'err']) {
                if ((d[tool] || 0) > maxVal) maxVal = d[tool];
            }
        }

        // Find which tools have data
        const layers = [...TOOL_NAMES, 'err'];
        const activeTools = layers.filter(tool =>
            deltas.some(d => (d[tool] || 0) > 0));

        // Draw grid
        cr.setSourceRGBA(...t.grid);
        cr.setLineWidth(0.5);
        cr.setDash([2, 4], 0);
        for (let i = 1; i <= Math.min(maxVal, 3); i++) {
            const y = pad.top + gh - (i / maxVal) * gh;
            cr.moveTo(pad.left, y);
            cr.lineTo(w - pad.right, y);
            cr.stroke();
        }
        cr.setDash([], 0);

        // Draw each tool with smooth curves, gradient fill, glow (like activity graph)
        for (const tool of activeTools) {
            const color = colors[tool] || [0.5, 0.5, 0.5, 0.5];
            const rawPts = [];

            for (let i = 0; i < deltas.length; i++) {
                const x = pad.left + (i / (deltas.length - 1)) * gw;
                const val = deltas[i][tool] || 0;
                const y = pad.top + gh - (val / maxVal) * gh;
                rawPts.push({x, y});
            }

            // Catmull-Rom smooth (reuse same algo as activity graph)
            let points = rawPts;
            if (rawPts.length >= 3) {
                points = [];
                for (let i = 0; i < rawPts.length - 1; i++) {
                    const p0 = rawPts[Math.max(i - 1, 0)];
                    const p1 = rawPts[i];
                    const p2 = rawPts[i + 1];
                    const p3 = rawPts[Math.min(i + 2, rawPts.length - 1)];
                    for (let s = 0; s <= 1; s += 0.15) {
                        const s2 = s * s, s3 = s2 * s;
                        points.push({
                            x: 0.5 * ((2*p1.x) + (-p0.x+p2.x)*s + (2*p0.x-5*p1.x+4*p2.x-p3.x)*s2 + (-p0.x+3*p1.x-3*p2.x+p3.x)*s3),
                            y: 0.5 * ((2*p1.y) + (-p0.y+p2.y)*s + (2*p0.y-5*p1.y+4*p2.y-p3.y)*s2 + (-p0.y+3*p1.y-3*p2.y+p3.y)*s3),
                        });
                    }
                }
                points.push(rawPts[rawPts.length - 1]);
            }

            // Gradient fill
            const gradient = new Cairo.LinearGradient(0, pad.top, 0, pad.top + gh);
            gradient.addColorStopRGBA(0, color[0], color[1], color[2], color[3] * 0.30);
            gradient.addColorStopRGBA(0.5, color[0], color[1], color[2], color[3] * 0.08);
            gradient.addColorStopRGBA(1, color[0], color[1], color[2], 0.01);
            cr.setSource(gradient);
            cr.moveTo(pad.left, pad.top + gh);
            for (const pt of points) cr.lineTo(pt.x, pt.y);
            cr.lineTo(points[points.length - 1].x, pad.top + gh);
            cr.closePath();
            cr.fill();

            // Glow line
            cr.setSourceRGBA(color[0], color[1], color[2], color[3] * 0.20);
            cr.setLineWidth(t.glowWidth * 0.6);
            cr.setLineJoin(Cairo.LineJoin.ROUND);
            cr.setLineCap(Cairo.LineCap.ROUND);
            cr.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) cr.lineTo(points[i].x, points[i].y);
            cr.stroke();

            // Main line
            cr.setSourceRGBA(color[0], color[1], color[2], color[3]);
            cr.setLineWidth(t.lineWidth * 0.8);
            cr.setLineJoin(Cairo.LineJoin.ROUND);
            cr.setLineCap(Cairo.LineCap.ROUND);
            cr.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) cr.lineTo(points[i].x, points[i].y);
            cr.stroke();
        }

        // Legend at bottom
        cr.setFontSize(7);
        let legendX = pad.left;

        for (const tool of activeTools) {
            const color = colors[tool] || [0.5, 0.5, 0.5, 0.8];
            // Color dot
            cr.setSourceRGBA(color[0], color[1], color[2], color[3]);
            cr.rectangle(legendX, h - 9, 5, 5);
            cr.fill();
            // Label
            cr.setSourceRGBA(...t.label);
            cr.moveTo(legendX + 7, h - 4);
            cr.showText(tool);
            legendX += tool.length * 5 + 16;
            if (legendX > w - 30) break;
        }

        cr.$dispose();
    }

    _roundedRect(cr, x, y, w, h, r) {
        cr.newSubPath();
        cr.arc(x + w - r, y + r, r, -Math.PI / 2, 0);
        cr.arc(x + w - r, y + h - r, r, 0, Math.PI / 2);
        cr.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
        cr.arc(x + r, y + r, r, Math.PI, 3 * Math.PI / 2);
        cr.closePath();
    }
});

// --- Panel Button ---

const ClaudePulseButton = GObject.registerClass({
    GTypeName: 'ClaudePulseButton',
}, class ClaudePulseButton extends PanelMenu.Button {
    _init(extensionObject) {
        super._init(0.0, 'Claude Pulse', false);

        this._extensionObject = extensionObject;
        try {
            this._settings = extensionObject.getSettings();
        } catch (_e) {
            this._settings = null;
        }
        this._activeAgents = new Map();
        this._activeSessions = new Map();
        this._completedAgents = new Map();
        this._sessionHistory = [];
        this._sessionMetrics = new Map();  // session_id -> {tools:{}, errors:0, compactions:0, tasks:0, prompts:0, worktrees:0}
        this._activeWorktrees = new Map();
        this._lastLineCount = 0;  // track file lines to only process new events
        this._fileMonitor = null;
        this._fileMonitorId = 0;
        this._tickTimerId = null;
        this._sampleTimerId = null;
        this._staleTimerId = null;
        this._history = [];

        // Panel layout: icon + label
        this._box = new St.BoxLayout({style_class: 'panel-status-indicators-box'});

        this._icon = new St.Icon({
            gicon: Gio.icon_new_for_string(
                GLib.build_filenamev([extensionObject.path, 'icons', 'claude-pulse-symbolic.svg'])),
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

        // Menu: header
        this._headerItem = new PopupMenu.PopupMenuItem('Claude Pulse — idle', {reactive: false});
        this._headerItem.label.style_class = 'claude-header-label';
        this.menu.addMenuItem(this._headerItem);

        // Menu: activity graph
        this._graphItem = new PopupMenu.PopupBaseMenuItem({reactive: false, can_focus: false});
        this._graph = new ActivityGraph(this._history);
        this._graphItem.add_child(this._graph);
        this.menu.addMenuItem(this._graphItem);

        // Menu: tools stacked area graph
        this._toolsGraphItem = new PopupMenu.PopupBaseMenuItem({reactive: false, can_focus: false});
        this._toolsGraph = new ToolsGraph();
        this._toolsGraphItem.add_child(this._toolsGraph);
        this.menu.addMenuItem(this._toolsGraphItem);

        // Menu: metrics under graph (custom widget)
        this._metricsItem = new PopupMenu.PopupBaseMenuItem({reactive: false, can_focus: false});
        this._metricsBox = new St.BoxLayout({style: 'spacing: 12px;'});
        this._metricsItem.add_child(this._metricsBox);
        this._metricsItem.visible = false;
        this.menu.addMenuItem(this._metricsItem);

        // Menu: AGENTS section
        this._agentHeader = new PopupMenu.PopupMenuItem('A G E N T S', {reactive: false});
        this._agentHeader.label.style_class = 'claude-section-title';
        this.menu.addMenuItem(this._agentHeader);

        this._agentSection = new PopupMenu.PopupMenuSection();
        this.menu.addMenuItem(this._agentSection);

        // Menu: SESSIONS section
        this._sessionHeader = new PopupMenu.PopupMenuItem('S E S S I O N S', {reactive: false});
        this._sessionHeader.label.style_class = 'claude-section-title';
        this.menu.addMenuItem(this._sessionHeader);

        this._sessionSection = new PopupMenu.PopupMenuSection();
        this.menu.addMenuItem(this._sessionSection);

        // Footer: GitHub + Settings icons
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        const footerItem = new PopupMenu.PopupBaseMenuItem({reactive: false, can_focus: false});
        const footerBox = new St.BoxLayout({
            x_expand: true,
            x_align: Clutter.ActorAlign.END,
            style: 'spacing: 8px;',
        });

        const ghButton = new St.Button({style_class: 'claude-footer-button'});
        ghButton.set_child(new St.Icon({
            gicon: Gio.icon_new_for_string(
                GLib.build_filenamev([extensionObject.path, 'icons', 'github-symbolic.svg'])),
            icon_size: 12,
        }));
        ghButton.connect('clicked', () => {
            Gio.AppInfo.launch_default_for_uri('https://github.com/delfour-co/claude-pulse', null);
        });
        footerBox.add_child(ghButton);

        const prefsButton = new St.Button({style_class: 'claude-footer-button'});
        prefsButton.set_child(new St.Icon({
            gicon: Gio.icon_new_for_string(
                GLib.build_filenamev([extensionObject.path, 'icons', 'cog-symbolic.svg'])),
            icon_size: 12,
        }));
        prefsButton.connect('clicked', () => {
            extensionObject.openPreferences();
        });
        footerBox.add_child(prefsButton);

        footerItem.add_child(footerBox);
        this.menu.addMenuItem(footerItem);

        const noAgents = new PopupMenu.PopupMenuItem('No active agents', {reactive: false});
        noAgents.label.style_class = 'claude-no-agents';
        this._agentSection.addMenuItem(noAgents);

        // Apply theme
        this._applyTheme();

        // Listen for theme changes
        if (this._settings) {
            this._themeChangedId = this._settings.connect('changed::theme', () => {
                this._applyTheme();
                this._graph.queue_repaint();
            });
        }

        this._setupFileMonitor();

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

        // Periodic reload every 5s as fallback (FileMonitor can miss events)
        this._reloadTimerId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 5, () => {
            this._reloadFile();
            return GLib.SOURCE_CONTINUE;
        });

        // Timers
        this._recordSample();
        this._sampleTimerId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, SAMPLE_INTERVAL_S, () => {
            this._recordSample();
            return GLib.SOURCE_CONTINUE;
        });

        this._tickTimerId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 2, () => {
            if (this.menu.isOpen) {
                this._updateMenu();
                this._graph.queue_repaint();
                this._toolsGraph.queue_repaint();
            }
            return GLib.SOURCE_CONTINUE;
        });

        this._staleTimerId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, STALE_CHECK_INTERVAL_S, () => {
            this._cleanupStaleAgents();
            this._maybeRotateEventsFile();
            return GLib.SOURCE_CONTINUE;
        });

        this._menuOpenId = this.menu.connect('open-state-changed', (_menu, isOpen) => {
            if (isOpen) {
                this._updateMenu();
                this._graph.queue_repaint();
            }
        });
    }

    _getSetting(type, key, fallback) {
        if (!this._settings) return fallback;
        try {
            if (type === 'bool') return this._settings.get_boolean(key);
            if (type === 'int') return this._settings.get_int(key);
            return this._settings.get_string(key);
        } catch (_e) {
            return fallback;
        }
    }

    _applyTheme() {
        const themeName = this._getSetting('string', 'theme', 'default');
        const theme = THEMES[themeName] || THEMES.default;
        this._currentTheme = theme;
        this._currentThemeName = themeName;
        this._graph.setTheme(theme);
        this._toolsGraph.setTheme(theme);

        // Apply theme CSS class and min-width to menu
        const themeNames = Object.keys(THEMES);
        for (const t of themeNames)
            this.menu.box.remove_style_class_name(`claude-theme-${t}`);
        this.menu.box.add_style_class_name(`claude-theme-${themeName}`);
        this.menu.box.style = 'min-width: 340px;';
    }

    _recordSample() {
        this._history.push(this._activeAgents.size);
        if (this._history.length > HISTORY_SIZE)
            this._history.shift();

        // Snapshot tool counts for tools graph
        const toolCounts = {};
        let errorCount = 0;
        for (const [_sid, m] of this._sessionMetrics) {
            for (const [tool, count] of Object.entries(m.tools))
                toolCounts[tool] = (toolCounts[tool] || 0) + count;
            errorCount += m.errors;
        }
        this._toolsGraph.recordSnapshot(toolCounts, errorCount);
    }

    // Scan Claude Code session files to find live sessions
    _scanLiveSessions() {
        const homeDir = GLib.get_home_dir();
        const sessionDirs = [];

        // Find all .claude* session directories
        try {
            const home = Gio.File.new_for_path(homeDir);
            const enumerator = home.enumerate_children('standard::name,standard::type',
                Gio.FileQueryInfoFlags.NONE, null);
            let info;
            while ((info = enumerator.next_file(null)) !== null) {
                const name = info.get_name();
                if (name.startsWith('.claude') && info.get_file_type() === Gio.FileType.DIRECTORY) {
                    const sessDir = GLib.build_filenamev([homeDir, name, 'sessions']);
                    if (GLib.file_test(sessDir, GLib.FileTest.IS_DIR))
                        sessionDirs.push({dir: sessDir, profile: name === '.claude' ? 'pro' : name.replace('.claude-', '')});
                }
            }
        } catch (_e) {
            return;
        }

        // Read each session file and check if PID is alive
        const liveSessions = new Map();
        for (const {dir, profile} of sessionDirs) {
            try {
                const sessFolder = Gio.File.new_for_path(dir);
                const en = sessFolder.enumerate_children('standard::name', Gio.FileQueryInfoFlags.NONE, null);
                let fi;
                while ((fi = en.next_file(null)) !== null) {
                    if (!fi.get_name().endsWith('.json')) continue;
                    try {
                        const path = GLib.build_filenamev([dir, fi.get_name()]);
                        const [ok, contents] = Gio.File.new_for_path(path).load_contents(null);
                        if (!ok) continue;
                        const sess = JSON.parse(new TextDecoder('utf-8').decode(contents));
                        // Check if PID is alive via /proc
                        if (sess.pid && GLib.file_test(`/proc/${sess.pid}`, GLib.FileTest.EXISTS)) {
                            liveSessions.set(sess.sessionId, {
                                session_id: sess.sessionId,
                                cwd: sess.cwd,
                                timestamp: new Date(sess.startedAt).toISOString(),
                                profile: profile,
                                model: null, // Not available in session file
                                branch: null,
                            });
                        }
                    } catch (_e) { /* skip invalid files */ }
                }
            } catch (_e) { /* skip inaccessible dirs */ }
        }

        // Merge: keep JSONL sessions that are in liveSessions, add missing ones
        const jsonlSessionIds = new Set(this._activeSessions.keys());
        for (const [sid, sess] of liveSessions) {
            if (!jsonlSessionIds.has(sid)) {
                // Session exists but wasn't in JSONL — add it
                this._activeSessions.set(sid, sess);
            }
        }
        // Remove sessions from JSONL that are no longer alive
        for (const sid of jsonlSessionIds) {
            if (!liveSessions.has(sid))
                this._activeSessions.delete(sid);
        }
    }

    _cleanupStaleAgents() {
        const timeoutS = this._getSetting('int', 'stale-agent-timeout', 1800);
        if (timeoutS <= 0) return;

        const nowMs = Date.now();
        let removed = false;

        for (const [agentId, agent] of this._activeAgents) {
            const agentMs = new Date(agent.timestamp).getTime();
            if ((nowMs - agentMs) / 1000 > timeoutS) {
                this._activeAgents.delete(agentId);
                removed = true;
            }
        }

        if (removed)
            this._updateMenu();
    }

    _maybeRotateEventsFile() {
        const maxSize = this._getSetting('int', 'max-events-file-size', 102400);
        if (maxSize <= 0) return;
        if (this._activeAgents.size > 0 || this._activeSessions.size > 0) return;

        try {
            if (!this._monitorFile || !this._monitorFile.query_exists(null)) return;

            const info = this._monitorFile.query_info('standard::size', Gio.FileQueryInfoFlags.NONE, null);
            if (info.get_size() > maxSize) {
                const stream = this._monitorFile.replace(null, false, Gio.FileCreateFlags.NONE, null);
                stream.close(null);
            }
        } catch (e) {
            console.error(`[ClaudePulse] File rotation failed: ${e.message}`);
        }
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

    _getOrCreateMetrics(sessionId) {
        if (!this._sessionMetrics.has(sessionId))
            this._sessionMetrics.set(sessionId, {
                tools: {}, toolTotal: 0, errors: 0, compactions: 0,
                tasks: [], prompts: 0, agentsSpawned: 0,
                costUsd: 0, tokens: 0, contextTokens: 0,
            });
        return this._sessionMetrics.get(sessionId);
    }

    _processEvent(ev, isNew) {
        const sid = ev.session_id;

        switch (ev.event) {
            case 'SubagentStart':
                this._activeAgents.set(ev.agent_id, ev);
                if (sid) this._getOrCreateMetrics(sid).agentsSpawned++;
                if (isNew) {
                    this._notifyAgentStarted(ev);
                    this._updateDND();
                }
                break;

            case 'SubagentStop':
                this._activeAgents.delete(ev.agent_id);
                if (ev.summary)
                    this._completedAgents.set(ev.agent_id, ev);
                if (isNew) {
                    this._notifyAgentStopped(ev);
                    this._playFinishSound();
                    this._updateDND();
                }
                break;

            case 'SessionStart':
                this._activeSessions.set(sid, ev);
                this._sessionStarts.set(sid, ev);
                break;

            case 'SessionEnd':
                this._activeSessions.delete(sid);
                const startEv = this._sessionStarts.get(sid);
                if (startEv) {
                    const maxHist = this._getSetting('int', 'session-history-size', MAX_SESSION_HISTORY);
                    const m = this._sessionMetrics.get(sid);
                    this._sessionHistory.push({
                        session_id: sid, cwd: ev.cwd,
                        profile: ev.profile, model: startEv.model,
                        started: startEv.timestamp, ended: ev.timestamp,
                        metrics: m || null,
                    });
                    if (this._sessionHistory.length > maxHist)
                        this._sessionHistory.shift();
                }
                this._sessionMetrics.delete(sid);
                for (const [agentId, agent] of this._activeAgents) {
                    if (agent.session_id === sid)
                        this._activeAgents.delete(agentId);
                }
                break;

            case 'ToolUse':
                if (sid) {
                    const mt = this._getOrCreateMetrics(sid);
                    mt.toolTotal++;
                    mt.tools[ev.tool_name] = (mt.tools[ev.tool_name] || 0) + 1;
                }
                break;

            case 'Compact':
                if (sid) {
                    const mc = this._getOrCreateMetrics(sid);
                    mc.compactions++;
                    if (ev.context_tokens) mc.contextTokens = ev.context_tokens;
                }
                if (isNew && this._getSetting('bool', 'notify-compact', true))
                    Main.notify('Claude Pulse', `Context compacted — ${ev.trigger || 'auto'}`);
                break;

            case 'Cost':
                if (sid) {
                    const mx = this._getOrCreateMetrics(sid);
                    mx.costUsd = ev.cost_usd || 0;
                    mx.tokens = ev.tokens || 0;
                }
                break;

            case 'ToolError':
                if (sid) this._getOrCreateMetrics(sid).errors++;
                if (isNew && this._getSetting('bool', 'notify-tool-error', false))
                    Main.notify('Claude Pulse', `Tool error: ${ev.tool_name} — ${truncate(ev.error, 80)}`);
                break;

            case 'TaskDone':
                if (sid) {
                    const mt2 = this._getOrCreateMetrics(sid);
                    mt2.tasks.push(ev.task_subject || 'task');
                }
                if (isNew && this._getSetting('bool', 'notify-task-done', false))
                    Main.notify('Claude Pulse', `Task completed: ${ev.task_subject || 'task'}`);
                break;

            case 'WorktreeCreate':
                if (ev.name)
                    this._activeWorktrees.set(ev.name, ev);
                break;

            case 'WorktreeRemove':
                if (ev.worktree_path) {
                    for (const [name] of this._activeWorktrees) {
                        if (ev.worktree_path.includes(name))
                            this._activeWorktrees.delete(name);
                    }
                }
                break;

            case 'Prompt':
                if (sid) this._getOrCreateMetrics(sid).prompts++;
                break;

            case 'Notification':
                if (isNew && ev.message && this._getSetting('bool', 'notify-claude', false))
                    Main.notify(ev.title || 'Claude Code', ev.message);
                break;
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

            // If file hasn't changed, skip
            if (lines.length === this._lastLineCount)
                return;

            // Reset state and replay all events
            this._activeAgents.clear();
            this._activeSessions.clear();
            this._completedAgents.clear();
            this._sessionMetrics.clear();
            this._activeWorktrees.clear();
            this._sessionStarts = new Map();

            const prevLineCount = this._lastLineCount;
            this._lastLineCount = lines.length;

            for (let i = 0; i < lines.length; i++) {
                try {
                    const ev = JSON.parse(lines[i]);
                    // Only send notifications for lines added since last read
                    const isNew = i >= prevLineCount;
                    this._processEvent(ev, isNew);
                } catch (_e) {
                    // Skip malformed lines
                }
            }

            // Cross-check with live Claude Code sessions
            this._scanLiveSessions();

            this._updateMenu();
        } catch (e) {
            console.error(`[ClaudePulse] Reload failed: ${e.message}`);
        }
    }

    _updateMenu() {
        const agentCount = this._activeAgents.size;
        const sessionCount = this._activeSessions.size;

        // Panel label + header
        const isActive = agentCount > 0 || sessionCount > 0;
        const parts = [];
        if (agentCount > 0)
            parts.push(`${agentCount} agent${agentCount > 1 ? 's' : ''}`);
        if (sessionCount > 0)
            parts.push(`${sessionCount} session${sessionCount > 1 ? 's' : ''}`);
        const statusText = parts.length > 0 ? parts.join(' · ') : 'idle';

        this._label.text = statusText;
        this._label.style_class = isActive
            ? 'claude-panel-label-active'
            : 'claude-panel-label';

        this._headerItem.label.text = `Claude Pulse — ${statusText}`;

        // --- Metrics text under graph ---
        let totalTools = 0, totalErrors = 0, totalCompactions = 0, totalTasks = 0, totalCost = 0;
        const toolCounts = {};
        for (const [_sid, m] of this._sessionMetrics) {
            totalTools += m.toolTotal;
            totalErrors += m.errors;
            totalCompactions += m.compactions;
            totalTasks += m.tasks.length;
            totalCost += m.costUsd;
            for (const [tool, count] of Object.entries(m.tools))
                toolCounts[tool] = (toolCounts[tool] || 0) + count;
        }

        // Rebuild metrics widgets
        this._metricsBox.destroy_all_children();

        if (totalTools > 0 || totalErrors > 0 || totalCost > 0) {
            const sorted = Object.entries(toolCounts).sort((a, b) => b[1] - a[1]).slice(0, 4);
            const accentColor = this._currentTheme?.sessionIconColor || '#8be9fd';
            const labelColor = '#777';

            for (const [tool, count] of sorted) {
                const pair = new St.BoxLayout({style: 'spacing: 3px;'});
                pair.add_child(new St.Label({
                    text: tool,
                    style: `font-size: 10px; color: ${labelColor};`,
                    y_align: Clutter.ActorAlign.CENTER,
                }));
                pair.add_child(new St.Label({
                    text: `${count}`,
                    style: `font-size: 10px; color: ${accentColor}; font-weight: bold;`,
                    y_align: Clutter.ActorAlign.CENTER,
                }));
                this._metricsBox.add_child(pair);
            }

            if (totalErrors > 0) {
                const errPair = new St.BoxLayout({style: 'spacing: 3px;'});
                errPair.add_child(new St.Label({
                    text: 'err',
                    style: `font-size: 10px; color: ${labelColor};`,
                    y_align: Clutter.ActorAlign.CENTER,
                }));
                errPair.add_child(new St.Label({
                    text: `${totalErrors}`,
                    style: 'font-size: 10px; color: #f55; font-weight: bold;',
                    y_align: Clutter.ActorAlign.CENTER,
                }));
                this._metricsBox.add_child(errPair);
            }

            if (totalCost > 0) {
                const costPair = new St.BoxLayout({style: 'spacing: 3px;'});
                costPair.add_child(new St.Label({
                    text: '$',
                    style: `font-size: 10px; color: ${labelColor};`,
                    y_align: Clutter.ActorAlign.CENTER,
                }));
                costPair.add_child(new St.Label({
                    text: totalCost.toFixed(2),
                    style: `font-size: 10px; color: #50fa7b; font-weight: bold;`,
                    y_align: Clutter.ActorAlign.CENTER,
                }));
                this._metricsBox.add_child(costPair);
            }

            this._metricsItem.visible = true;
        } else {
            this._metricsItem.visible = false;
        }

        // --- AGENTS ---
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

                // Agent item with robot icon and profile badge
                const item = new PopupMenu.PopupBaseMenuItem();
                const box = new St.BoxLayout({x_expand: true, style: 'spacing: 6px;'});

                // Agent icon (theme-aware)
                const iconColor = this._currentTheme?.iconColor || '#6cc';
                box.add_child(new St.Icon({
                    gicon: Gio.icon_new_for_string(
                        GLib.build_filenamev([this._extensionObject.path, 'icons', 'agent-symbolic.svg'])),
                    icon_size: 16,
                    style: `color: ${iconColor};`,
                    y_align: Clutter.ActorAlign.CENTER,
                }));

                // Agent text with branch
                const branchTag = agent.branch ? ` [${agent.branch}]` : '';
                box.add_child(new St.Label({
                    text: `${agent.agent_type} — ${project} (${duration})${branchTag}`,
                    y_align: Clutter.ActorAlign.CENTER,
                    x_expand: true,
                    style: 'font-size: 12px;',
                }));

                // Profile badge pill
                if (agent.profile && agent.profile !== 'default') {
                    const badge = new St.Label({
                        text: agent.profile,
                        y_align: Clutter.ActorAlign.CENTER,
                        style_class: 'claude-profile-badge',
                    });
                    box.add_child(badge);
                }

                item.add_child(box);

                // Click to open project
                item.connect('activate', () => {
                    try {
                        const cwd = agent.cwd || '';
                        const clean = cwd.indexOf('/.claude/worktrees/') !== -1
                            ? cwd.substring(0, cwd.indexOf('/.claude/worktrees/'))
                            : cwd;
                        Gio.AppInfo.launch_default_for_uri(`file://${clean}`, null);
                    } catch (e) {
                        console.error(`[ClaudePulse] Open folder failed: ${e.message}`);
                    }
                });
                this._agentSection.addMenuItem(item);
            }
        }

        // --- SESSIONS ---
        this._sessionSection.removeAll();

        if (sessionCount > 0) {
            this._sessionHeader.visible = true;
            for (const [sid, session] of this._activeSessions) {
                const project = projectName(session.cwd);
                const model = session.model
                    ? session.model.replace('claude-', '').replace(/-\d+$/, '')
                    : '';
                const duration = formatDuration(session.timestamp);

                // Session item with icon, text, metrics inline, badge
                const item = new PopupMenu.PopupBaseMenuItem({reactive: false});
                const outerBox = new St.BoxLayout({x_expand: true, style: 'spacing: 6px;'});

                const sessIconColor = this._currentTheme?.sessionIconColor || '#8be9fd';
                outerBox.add_child(new St.Icon({
                    gicon: Gio.icon_new_for_string(
                        GLib.build_filenamev([this._extensionObject.path, 'icons', 'console-symbolic.svg'])),
                    icon_size: 14,
                    style: `color: ${sessIconColor};`,
                    y_align: Clutter.ActorAlign.START,
                }));

                // Vertical box: session text + metrics
                const textBox = new St.BoxLayout({vertical: true, x_expand: true});

                const branchStr = session.branch ? ` · ${session.branch}` : '';
                const sessionText = model
                    ? `${project} · ${model}${branchStr} (${duration})`
                    : `${project}${branchStr} (${duration})`;
                textBox.add_child(new St.Label({
                    text: sessionText,
                    style: 'font-size: 11px; color: #aaa;',
                }));

                // Inline metrics
                const m = this._sessionMetrics.get(sid);
                if (m && (m.toolTotal > 0 || m.errors > 0 || m.prompts > 0 || m.costUsd > 0)) {
                    const p = [];
                    if (m.costUsd > 0) p.push(`$${m.costUsd.toFixed(2)}`);
                    if (m.toolTotal > 0) p.push(`${m.toolTotal} tool${m.toolTotal > 1 ? 's' : ''}`);
                    if (m.errors > 0) p.push(`${m.errors} err`);
                    if (m.compactions > 0) p.push(`${m.compactions} compact`);
                    if (m.prompts > 0) p.push(`${m.prompts} prompt${m.prompts > 1 ? 's' : ''}`);
                    if (m.agentsSpawned > 0) p.push(`${m.agentsSpawned} agent${m.agentsSpawned > 1 ? 's' : ''}`);

                    // Context health indicator
                    let ctxStr = '';
                    if (m.contextTokens > 0) {
                        // Estimate % based on model context window
                        const modelName = session.model || '';
                        const ctxWindow = modelName.includes('opus') ? 200000
                            : modelName.includes('haiku') ? 200000 : 200000;
                        const pct = Math.min(100, Math.round(m.contextTokens / ctxWindow * 100));
                        ctxStr = ` · ctx ${pct}%`;
                    }

                    textBox.add_child(new St.Label({
                        text: p.join(' · ') + ctxStr,
                        style: 'font-size: 9px; color: #555; margin-top: 2px;',
                    }));
                }

                outerBox.add_child(textBox);

                if (session.profile && session.profile !== 'default') {
                    outerBox.add_child(new St.Label({
                        text: session.profile,
                        y_align: Clutter.ActorAlign.CENTER,
                        style_class: 'claude-profile-badge',
                    }));
                }

                item.add_child(outerBox);
                this._sessionSection.addMenuItem(item);
            }
        } else {
            this._sessionHeader.visible = false;
        }
    }

    // #8: notify on agent start (configurable)
    _notifyAgentStarted(ev) {
        if (!this._getSetting('bool', 'notify-agent-start', false)) return;

        try {
            const project = projectName(ev.cwd || '');
            const profileTag = (ev.profile && ev.profile !== 'default')
                ? ` [${ev.profile}]`
                : '';
            const body = `${ev.agent_type} started — ${project}${profileTag}`;
            Main.notify('Claude Pulse', body);
        } catch (e) {
            console.error(`[ClaudePulse] Notification failed: ${e.message}`);
        }
    }

    _notifyAgentStopped(ev) {
        if (!this._getSetting('bool', 'notify-agent-stop', true)) return;

        try {
            const project = projectName(ev.cwd || '');
            const profileTag = (ev.profile && ev.profile !== 'default')
                ? ` [${ev.profile}]`
                : '';
            // #6: include summary in notification if available
            const summary = ev.summary ? `\n${truncate(ev.summary, 80)}` : '';
            const body = `${ev.agent_type} — ${project}${profileTag}${summary}`;
            Main.notify('Claude Pulse', body);
        } catch (e) {
            console.error(`[ClaudePulse] Notification failed: ${e.message}`);
        }
    }

    // --- Auto-DND ---
    _updateDND() {
        if (!this._getSetting('bool', 'auto-dnd', false)) return;

        const hasAgents = this._activeAgents.size > 0;
        try {
            const dndSettings = new Gio.Settings({schema_id: 'org.gnome.desktop.notifications'});
            const bannersShown = dndSettings.get_boolean('show-banners');

            if (hasAgents && bannersShown) {
                // Agents active, DND off → enable DND
                this._dndWasEnabled = false;
                dndSettings.set_boolean('show-banners', false);
            } else if (!hasAgents && !bannersShown && this._dndWasEnabled === false) {
                // No agents, DND on by us → restore
                dndSettings.set_boolean('show-banners', true);
                this._dndWasEnabled = null;
            }
        } catch (_e) {
            // Ignore — schema might not exist
        }
    }

    // --- Sound alert ---
    _playFinishSound() {
        if (!this._getSetting('bool', 'sound-on-finish', false)) return;

        try {
            const proc = Gio.Subprocess.new(
                ['canberra-gtk-play', '-i', 'complete', '-d', 'Agent finished'],
                Gio.SubprocessFlags.NONE
            );
        } catch (_e) {
            // canberra-gtk-play not available
        }
    }

    destroy() {
        // Restore DND if we changed it
        if (this._dndWasEnabled === false) {
            try {
                const dndSettings = new Gio.Settings({schema_id: 'org.gnome.desktop.notifications'});
                dndSettings.set_boolean('show-banners', true);
            } catch (_e) { /* ignore */ }
        }

        if (this._themeChangedId && this._settings) {
            this._settings.disconnect(this._themeChangedId);
            this._themeChangedId = null;
        }

        if (this._reloadTimerId) {
            GLib.Source.remove(this._reloadTimerId);
            this._reloadTimerId = null;
        }

        if (this._staleTimerId) {
            GLib.Source.remove(this._staleTimerId);
            this._staleTimerId = null;
        }

        if (this._sampleTimerId) {
            GLib.Source.remove(this._sampleTimerId);
            this._sampleTimerId = null;
        }

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
        pulseButton = new ClaudePulseButton(this);
        Main.panel.addToStatusArea(this.uuid, pulseButton);

        // Keyboard shortcut
        try {
            const settings = this.getSettings();
            Main.wm.addKeybinding(
                'toggle-menu',
                settings,
                Meta.KeyBindingFlags.NONE,
                Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
                () => { pulseButton.menu.toggle(); }
            );
        } catch (_e) {
            // Settings not available
        }
    }

    disable() {
        try {
            Main.wm.removeKeybinding('toggle-menu');
        } catch (_e) { /* ignore */ }

        pulseButton?.destroy();
        pulseButton = null;
    }
}
