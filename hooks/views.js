"use strict";
// What the pane, the band and the inline card draw, built from state that
// register.tsx has read. Pure: no `$`; presses arrive as closures (Actions).
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
exports.timelineRows = timelineRows;
exports.laneUsage = laneUsage;
exports.elapsed = elapsed;
exports.statsLine = statsLine;
exports.treeRows = treeRows;
exports.paneTree = paneTree;
exports.bandTree = bandTree;
exports.cardTree = cardTree;
var format_1 = require("./format");
var kinds_1 = require("./kinds");
var model_1 = require("./model");
var palette_1 = require("./palette");
var svg_mini_1 = require("./svg-mini");
// ---- rows for the pictures ----------------------------------------------------
var KEEP_LIVE = 1;
/** The visible lanes in display order, with workflow headings, ready for the timeline. */
function timelineRows(session, lanes, ui, viewKey, t0) {
    var _a, _b, _c, _d, _e;
    var rows = [];
    var run;
    var recency = 0;
    var byRecency = __spreadArray([], session.order, true).sort(function (a, b) { var _a, _b, _c, _d; return ((_b = (_a = session.digests[b]) === null || _a === void 0 ? void 0 : _a.lastAt) !== null && _b !== void 0 ? _b : 0) - ((_d = (_c = session.digests[a]) === null || _c === void 0 ? void 0 : _c.lastAt) !== null && _d !== void 0 ? _d : 0); });
    var rank = new Map(byRecency.map(function (k, i) { return [k, i]; }));
    for (var _i = 0, _f = session.order; _i < _f.length; _i++) {
        var key = _f[_i];
        var d = session.digests[key];
        var lane = lanes.get(key);
        if (!d || d.hidden || !lane)
            continue;
        if (d.run !== run) {
            run = d.run;
            if (run !== undefined) {
                var wf = session.workflows[run];
                rows.push({ t: 'group', label: (wf === null || wf === void 0 ? void 0 : wf.name) ? wf.name : "Workflow ".concat((_a = wf === null || wf === void 0 ? void 0 : wf.ordinal) !== null && _a !== void 0 ? _a : '').trim(), depth: Math.max(0, d.depth) });
            }
        }
        var isMain = key === 'main';
        var emphasis = viewKey === key ? 'view' : undefined;
        var live = (0, model_1.isLive)(d.status) && !d.quiet;
        recency = (_b = rank.get(key)) !== null && _b !== void 0 ? _b : 999;
        var spans = lane.spans.filter(function (s) { var _a; return ((_a = s.end) !== null && _a !== void 0 ? _a : Infinity) >= t0; });
        rows.push({
            t: 'lane',
            key: key,
            label: d.label,
            depth: d.depth,
            color: d.color,
            status: d.status,
            isMain: isMain,
            quiet: d.quiet,
            start: (_c = lane.spawnedAt) !== null && _c !== void 0 ? _c : lane.firstAt,
            end: (0, model_1.isTerminal)(d.status) || d.status === 'remote' ? ((_d = lane.endedAt) !== null && _d !== void 0 ? _d : lane.lastAt) : undefined,
            spawnedAt: lane.spawnedAt,
            parentKey: (_e = lane.meta) === null || _e === void 0 ? void 0 : _e.parent,
            runs: lane.runs,
            steps: lane.steps.filter(function (s) { var _a; return ((_a = s.end) !== null && _a !== void 0 ? _a : Infinity) >= t0; }),
            spans: spans,
            rollups: lane.rollups.filter(function (r) { return r.end >= t0; }),
            emphasis: emphasis,
            keep: isMain ? 0 : live ? KEEP_LIVE : emphasis ? 2 : 3 + recency,
        });
    }
    return rows;
}
// ---- numbers -------------------------------------------------------------------
function laneUsage(lane) {
    var u = __assign({}, lane.tokens.committed);
    for (var _i = 0, _a = Object.values(lane.tokens.provisional); _i < _a.length; _i++) {
        var p = _a[_i];
        u.input += p.input;
        u.output += p.output;
        u.cacheRead += p.cacheRead;
        u.cacheWrite += p.cacheWrite;
    }
    return u;
}
function elapsed(d, now) {
    var _a;
    return Math.max(0, ((_a = d.endedAt) !== null && _a !== void 0 ? _a : now) - d.startedAt);
}
function subagents(session) {
    return session.order.map(function (k) { return session.digests[k]; }).filter(function (d) { return !!d && !d.hidden && d.key !== 'main'; });
}
function statsLine(session, now) {
    var subs = subagents(session);
    var live = subs.filter(function (d) { return (0, model_1.isLive)(d.status) && !d.quiet; }).length;
    var done = subs.filter(function (d) { return d.status === 'completed'; }).length;
    var failed = subs.filter(function (d) { return d.status === 'failed' || d.status === 'killed' || d.status === 'lost'; }).length;
    var parts = ["\u25CF ".concat(live, " live"), "\u2713 ".concat(done, " done")];
    if (failed)
        parts.push("\u2717 ".concat(failed));
    parts.push("".concat(session.totals.tools, " tools"), "".concat((0, format_1.fmtTokens)(session.totals.tokens), " tok"));
    if (session.totals.cached)
        parts.push("".concat((0, format_1.fmtTokens)(session.totals.cached), " cached"));
    if (session.firstSpawnAt !== undefined) {
        var wall = Math.max(1, now - session.firstSpawnAt);
        parts.push((0, format_1.fmtDuration)(wall));
        var agentTime = subs.reduce(function (s, d) { return s + elapsed(d, now); }, 0);
        if (agentTime > 0)
            parts.push("".concat((agentTime / wall).toFixed(1), "\u00D7 parallel"));
    }
    if (session.costUsd !== undefined)
        parts.push("$".concat(session.costUsd.toFixed(2)));
    return parts.join('  ·  ');
}
var STATUS_WORD = {
    pending: 'starting', running: 'running', waiting: 'waiting', idle: 'idle', completed: 'done',
    failed: 'failed', killed: 'stopped', lost: 'lost track', remote: 'remote',
};
function statusGlyph(d) {
    if (d.quiet)
        return '⋯';
    switch (d.status) {
        case 'completed': return '✓';
        case 'failed': return '✗';
        case 'killed': return '■';
        case 'lost': return '?';
        case 'remote': return '↗';
        case 'idle': return '◦';
        default: return '●';
    }
}
var SPIN = ['◐', '◓', '◑', '◒'];
/** A live agent's glyph turns once a second; an ended one shows how it ended. */
function liveGlyph(d, now) {
    return (0, model_1.isLive)(d.status) && !d.quiet ? SPIN[Math.floor(now / 1000) % SPIN.length] : statusGlyph(d);
}
function statusColor(d) {
    if (d.status === 'completed')
        return palette_1.STATUS_SWATCH.ok.dark;
    if (d.status === 'failed')
        return palette_1.STATUS_SWATCH.error.dark;
    return undefined;
}
function pictureEl(k, p) {
    if (p.kind === 'svg' && k.Svg) {
        return <k.Svg source={p.source} alt={p.alt} width={p.width} height={p.height} {...(p.interactive ? { isInteractive: true } : {})}/>;
    }
    if (p.kind === 'raster' && k.Raster) {
        var raster = <k.Raster key={p.key} cells={p.cells} columns={p.columns} rows={p.rows}/>;
        if (!p.labels)
            return raster;
        return (<k.Box flexDirection="row">
        <k.Box flexDirection="column" width={22} flexShrink={0}>
          {p.labels.map(function (l) { return <k.Text color={l.color} dimColor={l.dim} wrap="truncate-end">{l.text}</k.Text>; })}
        </k.Box>
        {raster}
      </k.Box>);
    }
    var lines = p.kind === 'text' ? p.lines : [{ text: p.kind === 'svg' ? p.alt : 'nothing to draw here', dim: true }];
    return <k.Box flexDirection="column">{lines.map(function (l) { return <k.Text color={l.color} dimColor={l.dim}>{l.text}</k.Text>; })}</k.Box>;
}
function legend(k) {
    return (<k.Box flexDirection="row" flexWrap="wrap" columnGap={2}>
      {kinds_1.KIND_ORDER.filter(function (kind) { return kind !== 'other'; }).map(function (kind) { return (<k.Text><k.Text color={palette_1.KIND_SWATCH[kind].dark}>■</k.Text><k.Text dimColor> {kinds_1.KIND_LABEL[kind]}</k.Text></k.Text>); })}
    </k.Box>);
}
function toolName(tool) {
    return tool.startsWith('mcp__') ? 'MCP' : tool;
}
function spanLine(k, s, t0) {
    var dur = s.end === undefined ? 'running' : (0, format_1.fmtDuration)(s.end - s.start);
    return (<k.Text wrap="truncate-end">
      <k.Text dimColor>+{(0, format_1.fmtDuration)(Math.max(0, s.start - t0)).padStart(5)} </k.Text>
      <k.Text color={palette_1.KIND_SWATCH[s.kind].dark}>▮</k.Text> {toolName(s.tool)}
      {s.summary ? <k.Text dimColor> {s.summary}</k.Text> : null}
      <k.Text dimColor> {dur}</k.Text>
      {s.isError ? <k.Text color={palette_1.STATUS_SWATCH.error.dark}> ✗</k.Text> : null}
    </k.Text>);
}
function mixLine(k, counts) {
    return (<k.Text wrap="wrap">
      {kinds_1.KIND_ORDER.filter(function (kind) { var _a; return ((_a = counts[kind]) !== null && _a !== void 0 ? _a : 0) > 0; }).map(function (kind) { return (<k.Text><k.Text color={palette_1.KIND_SWATCH[kind].dark}>■</k.Text> {kinds_1.KIND_LABEL[kind]} {counts[kind]}  </k.Text>); })}
    </k.Text>);
}
var LIVE_VERB = { text: 'writing', thinking: 'thinking', tool: 'calling' };
/** What a running agent is doing this moment: its open tool call, or the tail of what it streams. */
function liveLine(k, lane, now) {
    var open = __spreadArray([], lane.spans, true).reverse().find(function (s) { return s.end === undefined; });
    if (open) {
        return (<k.Text wrap="truncate-end">
        <k.Text color={palette_1.KIND_SWATCH[open.kind].dark}>▶</k.Text> {toolName(open.tool)}
        {open.summary ? <k.Text dimColor> {open.summary}</k.Text> : null}<k.Text dimColor> · {(0, format_1.fmtDuration)(now - open.start)}</k.Text>
      </k.Text>);
    }
    if (!lane.live)
        return null;
    var tail = lane.live.text.replace(/\s+/g, ' ').trim();
    return (<k.Text wrap="truncate-start" dimColor={lane.live.kind === 'thinking'} italic={lane.live.kind === 'thinking'}>
      <k.Text color={(0, palette_1.textColor)(lane.color, k.surface)}>{LIVE_VERB[lane.live.kind]}</k.Text> {tail}
    </k.Text>);
}
function transcriptView(k, rows) {
    if (rows === undefined)
        return <k.Text dimColor>Reading the transcript…</k.Text>;
    if (rows === 'unreadable')
        return <k.Text dimColor>This agent's transcript can't be read from here (workflow and remote agents keep theirs elsewhere).</k.Text>;
    if (rows.length === 0)
        return <k.Text dimColor>Nothing in its transcript yet.</k.Text>;
    var shown = rows.slice(-14);
    return (<k.Box flexDirection="column">
      {rows.length > shown.length ? <k.Text dimColor>… {rows.length - shown.length} earlier messages</k.Text> : null}
      {shown.map(function (m, i) { return (<k.Box flexDirection="column" marginTop={i ? 1 : 0}>
          {m.role === 'user'
                ? (m.text ? <k.Text dimColor wrap="wrap">{i === 0 && rows.length === shown.length ? 'Task: ' : '› '}{(0, format_1.clip)(m.text, 600)}</k.Text> : null)
                : (m.text ? <k.Markdown text={(0, format_1.clip)(m.text, 1500)}/> : null)}
          {m.tools.map(function (t) { return (<k.Text wrap="truncate-end"><k.Text dimColor>  ⎿ </k.Text>{toolName(t.tool)}{t.summary ? <k.Text dimColor> {t.summary}</k.Text> : null}{t.isError ? <k.Text color={palette_1.STATUS_SWATCH.error.dark}> ✗</k.Text> : null}</k.Text>); })}
        </k.Box>); })}
    </k.Box>);
}
/**
 * Rows in display order with box-drawing rails (`├─`, `└─`, `│`), children of a
 * folded agent left out. `n` is the agent's arrival ordinal: what its Buttons are keyed by.
 */
function treeRows(session, folded) {
    var _a;
    var items = [];
    var run;
    for (var _i = 0, _b = session.order; _i < _b.length; _i++) {
        var key = _b[_i];
        var d = session.digests[key];
        if (!d || d.hidden)
            continue;
        if (d.run !== run) {
            run = d.run;
            if (run !== undefined) {
                var wf = session.workflows[run];
                items.push({ group: (wf === null || wf === void 0 ? void 0 : wf.name) ? wf.name : "Workflow ".concat((_a = wf === null || wf === void 0 ? void 0 : wf.ordinal) !== null && _a !== void 0 ? _a : '').trim(), depth: Math.max(1, d.depth) });
            }
        }
        // A workflow's agents sit one level under its heading.
        items.push({ d: d, depth: d.depth + (d.run !== undefined ? 1 : 0) });
    }
    var out = [];
    var fold = new Set(folded);
    // Keys by arrival, not position: a new agent above never shifts a Button being clicked.
    var ordinal = new Map(Object.keys(session.digests).map(function (k, i) { return [k, i + 1]; }));
    var hideBelow = Infinity;
    items.forEach(function (it, i) {
        var _a;
        if (it.depth > hideBelow)
            return;
        hideBelow = Infinity;
        // Rails: for each ancestor level, a bar while that level has more rows to come.
        var more = function (level) {
            for (var j = i + 1; j < items.length; j++) {
                if (items[j].depth < level)
                    return false;
                if (items[j].depth === level)
                    return true;
            }
            return false;
        };
        var rail = '';
        for (var l = 1; l < it.depth; l++)
            rail += more(l) ? '│ ' : '  ';
        if (it.depth > 0)
            rail += more(it.depth) ? '├─' : '└─';
        var childRail = '';
        for (var l = 1; l <= it.depth; l++)
            childRail += more(l) ? '│ ' : '  ';
        if (it.group !== undefined) {
            out.push({ t: 'group', label: it.group, depth: it.depth, rail: rail });
            return;
        }
        var d = it.d;
        var children = 0;
        for (var j = i + 1; j < items.length && items[j].depth > it.depth; j++)
            if (items[j].d)
                children++;
        out.push({ t: 'agent', d: d, n: (_a = ordinal.get(d.key)) !== null && _a !== void 0 ? _a : out.length + 1, rail: rail, childRail: childRail, children: children });
        if (fold.has(d.key) && children > 0)
            hideBelow = it.depth;
    });
    return out;
}
/** A running agent's name breathes between its color and the page's text, once a second. */
function nameColor(d, surface, now) {
    if (!(0, model_1.isLive)(d.status) || d.quiet)
        return d.key === 'main' ? (0, palette_1.textColor)(-1, surface) : undefined;
    return Math.floor(now / 1000) % 2 === 0 ? (0, palette_1.textColor)(d.color, surface) : undefined;
}
function agentRow(k, x, row, a) {
    var _a, _b, _c;
    var d = row.d, n = row.n;
    var lane = x.lanes.get(d.key);
    var live = (0, model_1.isLive)(d.status) && !d.quiet;
    var isOpen = ((_a = x.ui.expanded) !== null && _a !== void 0 ? _a : []).includes(d.key);
    var isFolded = ((_b = x.ui.folded) !== null && _b !== void 0 ? _b : []).includes(d.key);
    var viewed = x.viewKey === d.key;
    var meta = [];
    if (d.key !== 'main')
        meta.push(d.model ? "".concat(d.type, " \u00B7 ").concat(shortModel(d.model)) : d.type);
    if (d.key !== 'main' || live)
        meta.push("".concat(STATUS_WORD[d.status]).concat(d.quiet ? ' (quiet)' : ''));
    if (d.key !== 'main')
        meta.push((0, format_1.fmtDuration)(elapsed(d, x.now)));
    meta.push("".concat(d.tools, " tools"), "".concat((0, format_1.fmtTokens)(d.tokens), " tok"));
    var stripWidth = 112;
    var strip = k.Svg && lane && d.key !== 'main' && lane.spans.length > 0 && x.columns >= 90
        ? (0, svg_mini_1.cardStripSvg)(lane.spans, { width: stripWidth, t0: (_c = lane.spawnedAt) !== null && _c !== void 0 ? _c : lane.firstAt, now: lane.lastAt, end: lane.endedAt, color: lane.color, live: live })
        : undefined;
    var pad = row.childRail + '  ';
    return (<k.Box flexDirection="column">
      <k.Box flexDirection="row" columnGap={1}>
        <k.Box flexDirection="row" flexShrink={0}>
          {row.rail ? <k.Text dimColor>{row.rail}</k.Text> : null}
          {row.children > 0
            ? <k.Button key={"fold-".concat(n)} plain dimColor label={isFolded ? "\u25B8".concat(row.children) : '▾'} onPress={function () { return a.fold(d.key); }}/>
            : <k.Text dimColor>{row.rail ? '─' : ' '}</k.Text>}
        </k.Box>
        <k.Button key={"row-".concat(n)} plain onPress={function () { return a.expand(d.key); }}>
          <k.Text color={(0, palette_1.textColor)(d.color, k.surface)}>{liveGlyph(d, x.now)}</k.Text> <k.Text bold={live || d.key === 'main' || isOpen} color={nameColor(d, k.surface, x.now)} underline={viewed}>{(0, format_1.clip)(d.label, 48)}</k.Text>
        </k.Button>
        <k.Text dimColor wrap="truncate-end">{meta.join(' · ')}{d.errors ? " \u00B7 ".concat(d.errors, " errors") : ''}</k.Text>
        {strip && k.Svg ? <k.Box flexShrink={0}><k.Svg source={strip} alt={"".concat(d.tools, " tool calls")} width={stripWidth} height={14}/></k.Box> : null}
      </k.Box>
      {live && lane ? (<k.Box flexDirection="row"><k.Text dimColor>{pad}</k.Text>{liveLine(k, lane, x.now)}</k.Box>) : null}
      {isOpen && lane ? (<k.Box flexDirection="row">
          <k.Text dimColor>{pad}</k.Text>
          {expandedBlock(k, x, d, lane, n, a)}
        </k.Box>) : null}
    </k.Box>);
}
function shortModel(model) {
    return model.replace(/^claude-/, '').replace(/-\d{8}$/, '');
}
function expandedBlock(k, x, d, lane, n, a) {
    var _a, _b;
    var u = laneUsage(lane);
    var parent = d.parent ? x.session.digests[d.parent] : undefined;
    var showTranscript = x.ui.transcriptOf === d.key && d.key !== 'main';
    var answer = (_a = lane.answer) !== null && _a !== void 0 ? _a : '';
    var recent = lane.spans.slice(-8);
    return (<k.Box flexDirection="column" borderStyle="round" borderDimColor paddingX={1} flexGrow={1}>
      <k.Text dimColor wrap="wrap">
        {(0, format_1.fmtTokens)((0, model_1.totalTokens)(lane.tokens))} tokens
        {u.input + u.output > 0 ? " (in ".concat((0, format_1.fmtTokens)(u.input), " \u00B7 out ").concat((0, format_1.fmtTokens)(u.output)).concat(u.cacheWrite ? " \u00B7 cache write ".concat((0, format_1.fmtTokens)(u.cacheWrite)) : '', ")") : ''}
        {u.cacheRead ? " \u00B7 ".concat((0, format_1.fmtTokens)(u.cacheRead), " cached") : ''}
        {parent && d.key !== 'main' ? " \u00B7 from ".concat(parent.label) : ''}
      </k.Text>
      {lane.tools > 0 ? mixLine(k, lane.counts) : null}
      {d.key !== 'main' ? (<k.Box flexDirection="row" columnGap={1}>
          <k.Button key={"act-".concat(n)} label="Activity" variant={showTranscript ? undefined : 'primary'} onPress={function () { return a.transcript(undefined); }}/>
          <k.Button key={"tx-".concat(n)} label="Transcript" variant={showTranscript ? 'primary' : undefined} onPress={function () { return a.transcript(d.key); }}/>
          {a.jump && ((_b = lane.meta) === null || _b === void 0 ? void 0 : _b.toolUseId) ? <k.Button key={"jump-".concat(n)} label="Show in conversation" dimColor onPress={function () { var _a; return (_a = a.jump) === null || _a === void 0 ? void 0 : _a.call(a, d.key); }}/> : null}
        </k.Box>) : null}
      {showTranscript ? transcriptView(k, x.transcript) : null}
      {!showTranscript && recent.length > 0 ? <k.Text dimColor>Recent calls{lane.tools > recent.length ? " (last ".concat(recent.length, " of ").concat(lane.tools, ")") : ''}</k.Text> : null}
      {!showTranscript ? recent.map(function (s) { var _a; return spanLine(k, s, (_a = lane.spawnedAt) !== null && _a !== void 0 ? _a : lane.firstAt); }) : null}
      {!showTranscript && answer ? <k.Markdown text={x.ui.fullAnswer ? answer : (0, format_1.clip)(answer, 700)}/> : null}
      {!showTranscript && answer.length > 700 ? <k.Box flexDirection="row"><k.Button key={"answer-".concat(n)} label={x.ui.fullAnswer ? 'Less' : 'Whole answer'} dimColor onPress={a.toggleAnswer}/></k.Box> : null}
    </k.Box>);
}
function tree(k, x, a) {
    var _a;
    var rows = treeRows(x.session, (_a = x.ui.folded) !== null && _a !== void 0 ? _a : []);
    return (<k.Box flexDirection="column">
      {rows.map(function (row) { return row.t === 'group'
            ? <k.Text dimColor>{row.rail}◇ {row.label}</k.Text>
            : agentRow(k, x, row, a); })}
    </k.Box>);
}
/** The timeline is a picture and takes no clicks: its agents, as buttons that open them in the tree. */
function timelinePicks(k, x, a) {
    var ordinal = new Map(Object.keys(x.session.digests).map(function (key, i) { return [key, i + 1]; }));
    return (<k.Box flexDirection="row" flexWrap="wrap" columnGap={2}>
      <k.Text dimColor>Open:</k.Text>
      {subagents(x.session).map(function (d) { return (<k.Button key={"tl-".concat(ordinal.get(d.key))} plain onPress={function () { var _a; return (_a = a.open) === null || _a === void 0 ? void 0 : _a.call(a, d.key); }}>
          <k.Text color={(0, palette_1.textColor)(d.color, k.surface)}>{liveGlyph(d, x.now)}</k.Text> {(0, format_1.clip)(d.label, 32)}
        </k.Button>); })}
    </k.Box>);
}
function paneTree(k, x, a) {
    var tabs = [['tree', 'Agents', '1'], ['timeline', 'Timeline', '2']];
    var tab = x.ui.tab === 'timeline' ? 'timeline' : 'tree';
    var hasAgents = subagents(x.session).length > 0;
    return (<k.Box flexDirection="column" gap={1}>
      <k.Box flexDirection="row" columnGap={2} flexWrap="wrap">
        <k.Text wrap="truncate-end">{statsLine(x.session, x.now)}</k.Text>
        {x.sparkline ? pictureEl(k, x.sparkline) : null}
      </k.Box>
      <k.Box flexDirection="row" columnGap={1}>
        {tabs.map(function (_a) {
            var id = _a[0], label = _a[1], key = _a[2];
            return (<k.Button key={"tab-".concat(id)} label={label} hotkey={key} variant={tab === id ? 'primary' : undefined} onPress={function () { return a.tab(id); }}/>);
        })}
        {tab === 'timeline' ? <k.Button key="window" label={x.ui.window === '10m' ? 'Last 10 min' : 'Whole session'} hotkey="w" dimColor onPress={a.toggleWindow}/> : null}
      </k.Box>
      {tab === 'tree' ? tree(k, x, a) : null}
      {tab === 'timeline' && x.picture ? pictureEl(k, x.picture) : null}
      {tab === 'timeline' && hasAgents ? legend(k) : null}
      {tab === 'timeline' && hasAgents ? timelinePicks(k, x, a) : null}
      {!hasAgents ? <k.Text dimColor>No subagents yet. They appear here as they spawn.</k.Text> : null}
    </k.Box>);
}
// ---- band --------------------------------------------------------------------
function bandTree(k, session, now, viewKey, grace, spark, a) {
    var subs = subagents(session);
    var live = subs.filter(function (d) { return (0, model_1.isLive)(d.status) && !d.quiet; });
    if (grace || live.length === 0) {
        var recent = subs.filter(function (d) { return d.endedAt !== undefined && now - d.endedAt < 15000; });
        var span = recent.length ? Math.max.apply(Math, recent.map(function (d) { var _a; return ((_a = d.endedAt) !== null && _a !== void 0 ? _a : now) - d.startedAt; })) : 0;
        return (<k.Box flexDirection="row" columnGap={1}>
        <k.Text><k.Text color={palette_1.STATUS_SWATCH.ok.dark}>✓</k.Text> {recent.length} agent{recent.length === 1 ? '' : 's'} done in {(0, format_1.fmtDuration)(span)} <k.Text dimColor>· {recent.reduce(function (s, d) { return s + d.tools; }, 0)} tools</k.Text></k.Text>
        {a.open ? <k.Button key="band-open" label="Agents" hotkey="o" plain dimColor onPress={function () { var _a; return (_a = a.open) === null || _a === void 0 ? void 0 : _a.call(a); }}/> : null}
      </k.Box>);
    }
    return (<k.Box flexDirection="row" columnGap={1} flexWrap="wrap">
      <k.Text bold>◉ {live.length} agent{live.length === 1 ? '' : 's'}</k.Text>
      {live.slice(0, 6).map(function (d, i) { return (<k.Button key={"band-".concat(i + 1)} plain onPress={function () { var _a; return (_a = a.open) === null || _a === void 0 ? void 0 : _a.call(a, d.key); }}>
          <k.Text color={(0, palette_1.textColor)(d.color, k.surface)}>●</k.Text> <k.Text bold={viewKey === d.key}>{(0, format_1.clip)(d.label, 22)}</k.Text> <k.Text dimColor>{(0, format_1.fmtDuration)(elapsed(d, now))}</k.Text>
        </k.Button>); })}
      {live.length > 6 ? <k.Text dimColor>+{live.length - 6}</k.Text> : null}
      {spark ? pictureEl(k, spark) : null}
      {a.open ? <k.Button key="band-open" label="Agents" hotkey="o" plain dimColor onPress={function () { var _a; return (_a = a.open) === null || _a === void 0 ? void 0 : _a.call(a); }}/> : null}
    </k.Box>);
}
// ---- inline Agent card --------------------------------------------------------
function cardTree(k, d, lane, input, now, strip, children, a, below) {
    var _a, _b, _c, _d;
    var live = d ? (0, model_1.isLive)(d.status) && !d.quiet : true;
    var label = (_a = d === null || d === void 0 ? void 0 : d.label) !== null && _a !== void 0 ? _a : (input.description ? (0, format_1.clip)(input.description, 48) : 'agent');
    var type = (_c = (_b = d === null || d === void 0 ? void 0 : d.type) !== null && _b !== void 0 ? _b : input.subagentType) !== null && _c !== void 0 ? _c : 'agent';
    var color = (_d = d === null || d === void 0 ? void 0 : d.color) !== null && _d !== void 0 ? _d : 0;
    return (<k.Box flexDirection="column">
      <k.Box flexDirection="column" borderStyle="round" borderColor={(0, palette_1.textColor)(color, k.surface)} paddingX={1}>
        <k.Box flexDirection="row" justifyContent="space-between">
          <k.Text wrap="truncate-end">
            <k.Text color={(0, palette_1.textColor)(color, k.surface)}>{d ? statusGlyph(d) : '●'}</k.Text> <k.Text bold>{type}</k.Text> <k.Text>{label}</k.Text>
            {(d === null || d === void 0 ? void 0 : d.model) ? <k.Text dimColor>  {d.model}</k.Text> : null}
          </k.Text>
          <k.Text color={d ? statusColor(d) : undefined}>{d ? "".concat(STATUS_WORD[d.status], " ").concat((0, format_1.fmtDuration)(elapsed(d, now))) : 'starting…'}</k.Text>
        </k.Box>
        {strip ? pictureEl(k, strip) : null}
        {lane ? (<k.Text dimColor wrap="truncate-end">
            {lane.tools} tools
            {kinds_1.KIND_ORDER.filter(function (kind) { var _a; return ((_a = lane.counts[kind]) !== null && _a !== void 0 ? _a : 0) > 0; }).slice(0, 4).map(function (kind) { return " \u00B7 ".concat(lane.counts[kind], " ").concat(kinds_1.KIND_LABEL[kind].toLowerCase()); }).join('')}
            {' · '}{(0, format_1.fmtTokens)((0, model_1.totalTokens)(lane.tokens))} tok{(0, model_1.cachedTokens)(lane.tokens) ? " + ".concat((0, format_1.fmtTokens)((0, model_1.cachedTokens)(lane.tokens)), " cached") : ''}{children ? " \u00B7 ".concat(children, " nested") : ''}{lane.errors ? " \u00B7 ".concat(lane.errors, " errors") : ''}
          </k.Text>) : null}
        {live && (d === null || d === void 0 ? void 0 : d.last) ? <k.Text dimColor wrap="truncate-end">↳ {d.last.summary || kinds_1.KIND_LABEL[d.last.kind]}</k.Text> : null}
        {a.open && d ? (<k.Box flexDirection="row"><k.Button key="card-details" label="Details" plain dimColor onPress={function () { var _a; return (_a = a.open) === null || _a === void 0 ? void 0 : _a.call(a, d.key); }}/></k.Box>) : null}
      </k.Box>
      {below !== null && below !== void 0 ? below : null}
    </k.Box>);
}
