"use strict";
// The swimlane timeline: one lane per agent under its parent, tool calls as
// ticks colored by kind, model requests shaded in the agent's color, live
// heads pulsing. A string builder that measures itself and sheds detail,
// level by level, until it fits the Svg limit. Pure: no `$`.
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.timelineAlt = timelineAlt;
exports.buildTimelineSvg = buildTimelineSvg;
var format_1 = require("./format");
var layout_1 = require("./layout");
var palette_1 = require("./palette");
var AXIS_H = 20;
var ROW_H = 20;
var GROUP_H = 15;
var BAR_H = 14;
var TICK_H = 8;
var RECENT_TITLES = 40;
var LIVE = new Set(['running', 'waiting', 'pending']);
/** Seconds of SMIL growth a live bar gets between redraws. */
var GROW_S = 60;
var LEVELS = [
    { titles: 'all', ticks: 'each', maxLanes: Infinity },
    { titles: 'recent', ticks: 'each', maxLanes: Infinity },
    { titles: 'none', ticks: 'merged', maxLanes: Infinity },
    { titles: 'none', ticks: 'buckets', maxLanes: Infinity },
    { titles: 'none', ticks: 'buckets', maxLanes: 40 },
    { titles: 'none', ticks: 'buckets', maxLanes: 15 },
    { titles: 'none', ticks: 'buckets', maxLanes: 0, summary: true },
];
var r = function (n) { return Math.round(n); };
function isLive(row) {
    return LIVE.has(row.status) && !row.quiet;
}
var GLYPH = {
    completed: ['✓', 'ok'],
    failed: ['✗', 'err'],
    killed: ['■', 'mut'],
    lost: ['?', 'mut'],
    remote: ['↗', 'mut'],
    idle: ['◦', 'mut'],
};
function dominant(counts) {
    var best = 'other';
    var n = -1;
    for (var _i = 0, _a = Object.entries(counts); _i < _a.length; _i++) {
        var _b = _a[_i], k = _b[0], v = _b[1];
        if (v > n) {
            best = k;
            n = v;
        }
    }
    return best;
}
/** Which lanes a level keeps: groups survive when one of their lanes does. */
function pickRows(rows, maxLanes) {
    var lanes = rows.filter(function (x) { return x.t === 'lane'; });
    if (lanes.length <= maxLanes)
        return { rows: __spreadArray([], rows, true), dropped: 0 };
    var keep = new Set(__spreadArray([], lanes, true).sort(function (a, b) { return a.keep - b.keep; }).slice(0, maxLanes).map(function (l) { return l.key; }));
    var out = [];
    var pendingGroup;
    for (var _i = 0, rows_1 = rows; _i < rows_1.length; _i++) {
        var row = rows_1[_i];
        if (row.t === 'group') {
            pendingGroup = row;
            continue;
        }
        if (!keep.has(row.key))
            continue;
        if (pendingGroup) {
            out.push(pendingGroup);
            pendingGroup = undefined;
        }
        out.push(row);
    }
    return { rows: out, dropped: lanes.length - keep.size };
}
function timelineAlt(rows) {
    var lanes = rows.filter(function (x) { return x.t === 'lane' && !x.isMain; });
    var live = lanes.filter(isLive).length;
    var done = lanes.filter(function (l) { return l.status === 'completed'; }).length;
    var tools = rows.reduce(function (n, x) { return n + (x.t === 'lane' ? x.spans.length : 0); }, 0);
    return "Timeline of ".concat(lanes.length, " subagent").concat(lanes.length === 1 ? '' : 's', ": ").concat(live, " running, ").concat(done, " done, ").concat(tools, " recent tool calls");
}
function buildAt(all, o, level) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    var width = r(Math.max(200, o.width));
    var t0 = o.t0;
    var t1 = Math.max(o.t1, t0 + 1000);
    var labelW = r(Math.max(110, Math.min(220, width * 0.26)));
    var x0 = labelW + 8;
    var x1 = width - 26;
    var span = t1 - t0;
    var pxPerMs = (x1 - x0) / span;
    var x = function (t) { return r(x0 + Math.max(0, Math.min(span, t - t0)) * pxPerMs); };
    var growTo = function (w, from) { return Math.max(w, Math.min(w + pxPerMs * GROW_S * 1000, x1 - from)); };
    var _j = level.summary ? { rows: [], dropped: 0 } : pickRows(all, level.maxLanes), rows = _j.rows, dropped = _j.dropped;
    var more = ((_a = o.moreCount) !== null && _a !== void 0 ? _a : 0) + dropped + (level.summary ? all.filter(function (x) { return x.t === 'lane'; }).length : 0);
    // Row positions first: spawn links need the parent's row.
    var yMid = new Map();
    var y = AXIS_H;
    var placed = [];
    for (var _i = 0, rows_2 = rows; _i < rows_2.length; _i++) {
        var row = rows_2[_i];
        placed.push({ row: row, top: y });
        if (row.t === 'lane')
            yMid.set(row.key, y + ROW_H / 2);
        y += row.t === 'lane' ? ROW_H : GROUP_H;
    }
    var height = y + (more > 0 ? 18 : 6);
    var out = [];
    out.push("<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"".concat(width, "\" height=\"").concat(height, "\" viewBox=\"0 0 ").concat(width, " ").concat(height, "\">"));
    out.push("<style>".concat(palette_1.STYLE, ".lab{font-size:11px}.sm{font-size:10px}.g{opacity:.55}</style>"));
    // Axis: round ticks, faint grid, the now line.
    var step = (0, layout_1.niceStep)(span, Math.floor((x1 - x0) / 70));
    var grid = [];
    for (var t = 0; t <= span; t += step) {
        var gx = x(t0 + t);
        out.push("<text x=\"".concat(gx, "\" y=\"12\" class=\"ax sm\" text-anchor=\"middle\">").concat((0, layout_1.axisLabel)(t), "</text>"));
        grid.push("M".concat(gx, " ").concat(AXIS_H - 4, "V").concat(height - 4));
    }
    if (grid.length)
        out.push("<path d=\"".concat(grid.join(''), "\" class=\"sax\" stroke-opacity=\".12\" fill=\"none\"/>"));
    var nx = x(o.now);
    out.push("<line x1=\"".concat(nx, "\" y1=\"").concat(AXIS_H - 6, "\" x2=\"").concat(nx, "\" y2=\"").concat(height - 4, "\" class=\"sax\" stroke-opacity=\".45\" stroke-dasharray=\"3 3\">").concat(o.animate && o.now < t1 ? "<animate attributeName=\"x1\" from=\"".concat(nx, "\" to=\"").concat(r(growTo(0, nx) + nx), "\" dur=\"").concat(GROW_S, "s\" fill=\"freeze\"/><animate attributeName=\"x2\" from=\"").concat(nx, "\" to=\"").concat(r(growTo(0, nx) + nx), "\" dur=\"").concat(GROW_S, "s\" fill=\"freeze\"/>") : '', "</line>"));
    var shimmers = 0;
    var _loop_1 = function (row, top_1) {
        if (row.t === 'group') {
            var ix_1 = 4 + row.depth * 12;
            out.push("<text x=\"".concat(ix_1, "\" y=\"").concat(top_1 + 11, "\" class=\"ax sm\">\u25C7 ").concat((0, format_1.xmlEscape)(row.label), "</text>"));
            out.push("<line x1=\"".concat(x0, "\" y1=\"").concat(top_1 + 8, "\" x2=\"").concat(x1, "\" y2=\"").concat(top_1 + 8, "\" class=\"sax\" stroke-opacity=\".18\"/>"));
            return "continue";
        }
        var mid = top_1 + ROW_H / 2;
        var id = (0, palette_1.idClass)(row.color);
        var live = isLive(row);
        var ix = 4 + row.depth * 12;
        if (row.emphasis)
            out.push("<rect x=\"0\" y=\"".concat(top_1, "\" width=\"").concat(width, "\" height=\"").concat(ROW_H, "\" class=\"fi").concat(id, "\" fill-opacity=\"").concat(row.emphasis === 'selected' ? '.10' : '.06', "\"/>"));
        // Label column: tree rail, identity dot, the name.
        if (row.depth > 0)
            out.push("<path d=\"M".concat(ix - 7, " ").concat(mid - 10, "V").concat(mid, "H").concat(ix - 1, "\" class=\"sax\" stroke-opacity=\".5\" fill=\"none\"/>"));
        out.push("<circle cx=\"".concat(ix + 4, "\" cy=\"").concat(mid, "\" r=\"3.5\" class=\"fi").concat(id, "\"/>"));
        var room = Math.max(4, Math.floor((labelW - ix - 14) / 6.1));
        var name_1 = row.label.length > room ? "".concat(row.label.slice(0, room - 1), "\u2026") : row.label;
        if (live && o.animate && !row.isMain && level.titles !== 'none') {
            var gid = "sh".concat(shimmers++);
            out.push("<defs>".concat((0, palette_1.shimmerDef)(gid, row.color, ix + 12, name_1.length * 6.4, true), "</defs>"));
            out.push("<text x=\"".concat(ix + 12, "\" y=\"").concat(mid + 4, "\" class=\"lab\" fill=\"url(#").concat(gid, ")\">").concat((0, format_1.xmlEscape)(name_1), "</text>"));
        }
        else {
            out.push("<text x=\"".concat(ix + 12, "\" y=\"").concat(mid + 4, "\" class=\"fg lab\"").concat(row.isMain ? ' font-weight="600"' : '').concat(row.quiet ? ' opacity=".55"' : '', ">").concat((0, format_1.xmlEscape)(name_1), "</text>"));
        }
        // Spawn link from the parent's row.
        var py = row.parentKey !== undefined ? yMid.get(row.parentKey) : undefined;
        if (py !== undefined && row.spawnedAt !== undefined) {
            var sx = x(row.spawnedAt);
            out.push("<path d=\"M".concat(sx, " ").concat(py, "V").concat(mid, "\" class=\"si").concat(id, "\" stroke-opacity=\".5\" stroke-dasharray=\"2 2\" fill=\"none\"/>"));
        }
        // Alive track (main: faint whole session, its turns brighter).
        var end = (_b = row.end) !== null && _b !== void 0 ? _b : o.now;
        var bx = x(row.start);
        var bw = Math.max(2, x(end) - bx);
        var barTop = mid - BAR_H / 2;
        var grow = live && o.animate && row.end === undefined;
        var growAnim = function (w, from) { return grow ? "<animate attributeName=\"width\" from=\"".concat(w, "\" to=\"").concat(r(growTo(w, from)), "\" dur=\"").concat(GROW_S, "s\" fill=\"freeze\"/>") : ''; };
        out.push("<rect x=\"".concat(bx, "\" y=\"").concat(barTop, "\" width=\"").concat(bw, "\" height=\"").concat(BAR_H, "\" rx=\"3\" class=\"fi").concat(id, "\" fill-opacity=\"").concat(row.isMain ? '.06' : '.16', "\">").concat(row.isMain ? '' : growAnim(bw, bx), "</rect>"));
        for (var _m = 0, _o = row.isMain || row.runs.length > 1 ? row.runs : []; _m < _o.length; _m++) {
            var run = _o[_m];
            var rx0 = x(run.start);
            var rw = Math.max(2, x((_c = run.end) !== null && _c !== void 0 ? _c : o.now) - rx0);
            out.push("<rect x=\"".concat(rx0, "\" y=\"").concat(barTop, "\" width=\"").concat(rw, "\" height=\"").concat(BAR_H, "\" rx=\"3\" class=\"fi").concat(id, "\" fill-opacity=\".16\">").concat(run.end === undefined ? growAnim(rw, rx0) : '', "</rect>"));
        }
        // Model requests: brighter shading in the agent's color.
        if (row.steps.length) {
            var d = [];
            for (var _p = 0, _q = row.steps; _p < _q.length; _p++) {
                var s = _q[_p];
                var sx = x(s.start);
                var sw = Math.max(1, x((_d = s.end) !== null && _d !== void 0 ? _d : o.now) - sx);
                d.push("M".concat(sx, " ").concat(barTop, "h").concat(sw, "v").concat(BAR_H, "h").concat(-sw, "z"));
            }
            out.push("<path d=\"".concat(d.join(''), "\" class=\"fi").concat(id, "\" fill-opacity=\".38\"/>"));
        }
        // Tool calls.
        var ty = mid - TICK_H / 2;
        for (var _r = 0, _s = row.rollups; _r < _s.length; _r++) {
            var ru = _s[_r];
            var rx0 = x(ru.start);
            var rw = Math.max(2, x(ru.end) - rx0);
            var n = Object.values(ru.counts).reduce(function (a, b) { return a + (b !== null && b !== void 0 ? b : 0); }, 0);
            var title = level.titles === 'none' ? '' : "<title>".concat(n, " earlier calls</title>");
            out.push("<rect x=\"".concat(rx0, "\" y=\"").concat(ty, "\" width=\"").concat(rw, "\" height=\"").concat(TICK_H, "\" class=\"k-").concat(dominant(ru.counts), "\" fill-opacity=\".5\">").concat(title, "</rect>"));
        }
        if (level.ticks === 'each') {
            var titled_1 = level.titles === 'all' ? 0 : Math.max(0, row.spans.length - RECENT_TITLES);
            row.spans.forEach(function (s, i) {
                var _a, _b;
                var sx = x(s.start);
                var open = s.end === undefined;
                var sw = Math.max(2, x((_a = s.end) !== null && _a !== void 0 ? _a : o.now) - sx);
                var anim = open && grow ? "<animate attributeName=\"width\" from=\"".concat(sw, "\" to=\"").concat(r(growTo(sw, sx)), "\" dur=\"").concat(GROW_S, "s\" fill=\"freeze\"/>") : '';
                var tip = level.titles !== 'none' && i >= titled_1
                    ? "<title>".concat((0, format_1.xmlEscape)(s.summary ? "".concat(s.tool, " \u00B7 ").concat(s.summary) : s.tool), " \u00B7 ").concat(open ? 'running' : (0, format_1.fmtDuration)(((_b = s.end) !== null && _b !== void 0 ? _b : o.now) - s.start)).concat(s.isError ? ' · error' : '', "</title>")
                    : '';
                out.push("<rect x=\"".concat(sx, "\" y=\"").concat(ty, "\" width=\"").concat(sw, "\" height=\"").concat(TICK_H, "\" class=\"k-").concat(s.kind, "\"").concat(open ? ' fill-opacity=".75"' : '', ">").concat(tip).concat(anim, "</rect>"));
                if (s.isError)
                    out.push("<rect x=\"".concat(sx, "\" y=\"").concat(ty - 2, "\" width=\"").concat(sw, "\" height=\"2\" class=\"err\"/>"));
            });
        }
        else if (level.ticks === 'merged') {
            var byKind = new Map();
            var errs = [];
            for (var _t = 0, _u = row.spans; _t < _u.length; _t++) {
                var s = _u[_t];
                var sx = x(s.start);
                var sw = Math.max(2, x((_e = s.end) !== null && _e !== void 0 ? _e : o.now) - sx);
                var list = (_f = byKind.get(s.kind)) !== null && _f !== void 0 ? _f : [];
                list.push("M".concat(sx, " ").concat(ty, "h").concat(sw, "v").concat(TICK_H, "h").concat(-sw, "z"));
                byKind.set(s.kind, list);
                if (s.isError)
                    errs.push("M".concat(sx, " ").concat(ty - 2, "h").concat(sw, "v2h").concat(-sw, "z"));
            }
            for (var _v = 0, byKind_1 = byKind; _v < byKind_1.length; _v++) {
                var _w = byKind_1[_v], k = _w[0], d = _w[1];
                out.push("<path d=\"".concat(d.join(''), "\" class=\"k-").concat(k, "\"/>"));
            }
            if (errs.length)
                out.push("<path d=\"".concat(errs.join(''), "\" class=\"err\"/>"));
        }
        else {
            // Buckets: each a few pixels, the dominant kind's color, denser is brighter.
            var bucketPx = Math.max(3, Math.round((x1 - x0) / Math.min(240, Math.max(30, Math.floor((x1 - x0) / 3)))));
            var buckets = new Map();
            for (var _x = 0, _y = row.spans; _x < _y.length; _x++) {
                var s = _y[_x];
                var b = Math.floor((x(s.start) - x0) / bucketPx);
                var c = (_g = buckets.get(b)) !== null && _g !== void 0 ? _g : {};
                c[s.kind] = ((_h = c[s.kind]) !== null && _h !== void 0 ? _h : 0) + 1;
                buckets.set(b, c);
            }
            var max = 1;
            for (var _z = 0, _0 = buckets.values(); _z < _0.length; _z++) {
                var c = _0[_z];
                max = Math.max(max, Object.values(c).reduce(function (a, v) { return a + (v !== null && v !== void 0 ? v : 0); }, 0));
            }
            for (var _1 = 0, buckets_1 = buckets; _1 < buckets_1.length; _1++) {
                var _2 = buckets_1[_1], b = _2[0], c = _2[1];
                var n = Object.values(c).reduce(function (a, v) { return a + (v !== null && v !== void 0 ? v : 0); }, 0);
                out.push("<rect x=\"".concat(x0 + b * bucketPx, "\" y=\"").concat(ty, "\" width=\"").concat(bucketPx - 1, "\" height=\"").concat(TICK_H, "\" class=\"k-").concat(dominant(c), "\" fill-opacity=\"").concat((0.35 + 0.65 * (n / max)).toFixed(2), "\"/>"));
            }
        }
        // Live head, or how it ended.
        if (live) {
            var hx = x(o.now);
            var pulse = o.animate
                ? "<animate attributeName=\"r\" values=\"3;6;3\" dur=\"1.4s\" repeatCount=\"indefinite\"/><animate attributeName=\"fill-opacity\" values=\"1;.45;1\" dur=\"1.4s\" repeatCount=\"indefinite\"/>" +
                    (grow ? "<animate attributeName=\"cx\" from=\"".concat(hx, "\" to=\"").concat(r(hx + growTo(0, hx)), "\" dur=\"").concat(GROW_S, "s\" fill=\"freeze\"/>") : '')
                : '';
            out.push("<circle cx=\"".concat(hx, "\" cy=\"").concat(mid, "\" r=\"3.5\" class=\"fi").concat(id, "\">").concat(pulse, "</circle>"));
        }
        else {
            var g = row.quiet ? ['⋯', 'mut'] : GLYPH[row.status];
            if (g)
                out.push("<text x=\"".concat(x1 + 8, "\" y=\"").concat(mid + 4, "\" class=\"").concat(g[1], " lab\">").concat(g[0], "</text>"));
        }
    };
    for (var _k = 0, placed_1 = placed; _k < placed_1.length; _k++) {
        var _l = placed_1[_k], row = _l.row, top_1 = _l.top;
        _loop_1(row, top_1);
    }
    if (more > 0) {
        out.push("<text x=\"4\" y=\"".concat(height - 5, "\" class=\"ax sm\">").concat(level.summary ? "".concat(more, " agents: too much activity to draw here; the Feed tab lists them") : "+".concat(more, " more agent").concat(more === 1 ? '' : 's', " not drawn"), "</text>"));
    }
    out.push('</svg>');
    return { source: out.join(''), height: height };
}
/** Builds at the richest level that fits `max` characters. */
function buildTimelineSvg(rows, o, max) {
    if (max === void 0) { max = layout_1.SVG_ELEMENT_MAX; }
    // Start where a rough count says the first fit lies, then step down by measuring.
    var ticks = rows.reduce(function (n, x) { return n + (x.t === 'lane' ? x.spans.length + x.steps.length + x.rollups.length : 0); }, 0);
    var start = 0;
    if (ticks * 110 > max)
        start = 1;
    if (ticks * 40 > max)
        start = 2;
    for (var i = start; i < LEVELS.length; i++) {
        var built = buildAt(rows, o, LEVELS[i]);
        if (built.source.length <= max)
            return __assign(__assign({}, built), { level: i, alt: timelineAlt(rows) });
    }
    var last = buildAt(rows, o, LEVELS[LEVELS.length - 1]);
    return __assign(__assign({}, last), { level: LEVELS.length - 1, alt: timelineAlt(rows) });
}
