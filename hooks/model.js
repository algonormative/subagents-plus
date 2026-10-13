"use strict";
// The reducer: events in, lanes and a session summary out. Pure: inputs are
// never mutated, nothing here touches `$`. register.tsx owns the plumbing
// (planBatch -> reduceLane per lane -> reduceSession) and the state families.
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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
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
exports.CAPS = void 0;
exports.isLive = isLive;
exports.isTerminal = isTerminal;
exports.usageTotal = usageTotal;
exports.addUsage = addUsage;
exports.totalTokens = totalTokens;
exports.cachedTokens = cachedTokens;
exports.emptySession = emptySession;
exports.emptyLane = emptyLane;
exports.planBatch = planBatch;
exports.reduceLane = reduceLane;
exports.digestOf = digestOf;
exports.laneOrder = laneOrder;
exports.reduceSession = reduceSession;
exports.reconcileEvents = reconcileEvents;
var format_1 = require("./format");
exports.CAPS = {
    spans: 300,
    rollupChunk: 10,
    rollups: 200,
    steps: 200,
    lanes: 150,
    answer: 4000,
    turnsDone: 64,
    lostAfterMs: 30000,
    quietAfterMs: 600000,
    hiddenGcMs: 60000,
};
var PALETTE = 7;
function isLive(status) {
    return status === 'running' || status === 'waiting' || status === 'pending';
}
function isTerminal(status) {
    return status === 'completed' || status === 'failed' || status === 'killed' || status === 'lost';
}
// ---- tokens -------------------------------------------------------------
var zeroUsage = function () { return ({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }); };
function usageTotal(u) {
    return u.input + u.output + u.cacheRead + u.cacheWrite;
}
function addUsage(a, b) {
    return {
        input: a.input + b.input,
        output: a.output + b.output,
        cacheRead: a.cacheRead + b.cacheRead,
        cacheWrite: a.cacheWrite + b.cacheWrite,
    };
}
/**
 * Tokens the lane paid for fresh (input, output, cache writes): committed
 * turns plus requests of turns still running; the foreground fallback only
 * when nothing is recorded. Cache reads are counted apart (cachedTokens):
 * summed over every request they dwarf the rest.
 */
function totalTokens(t) {
    var _a;
    var sum = usageTotal(t.committed) - t.committed.cacheRead;
    var any = usageTotal(t.committed) > 0;
    for (var _i = 0, _b = Object.values(t.provisional); _i < _b.length; _i++) {
        var u = _b[_i];
        sum += usageTotal(u) - u.cacheRead;
        any || (any = usageTotal(u) > 0);
    }
    return any ? sum : ((_a = t.fallback) !== null && _a !== void 0 ? _a : 0);
}
/** Input tokens the prompt cache served, over the same requests as totalTokens. */
function cachedTokens(t) {
    var sum = t.committed.cacheRead;
    for (var _i = 0, _a = Object.values(t.provisional); _i < _a.length; _i++) {
        var u = _a[_i];
        sum += u.cacheRead;
    }
    return sum;
}
// ---- constructors -------------------------------------------------------
function emptySession(epoch, now) {
    return {
        v: 1,
        epoch: epoch,
        startedAt: now,
        order: [],
        digests: {},
        workflows: {},
        colorNext: 0,
        live: 0,
        done: 0,
        failed: 0,
        archived: { lanes: 0, tokens: 0, tools: 0, errors: 0 },
        totals: { tokens: 0, tools: 0, errors: 0 },
        lastEventAt: now,
    };
}
function emptyLane(key, epoch, color, at) {
    return {
        v: 1,
        key: key,
        epoch: epoch,
        color: color,
        status: key === 'main' ? 'idle' : 'pending',
        firstAt: at,
        lastAt: at,
        runs: [],
        spans: [],
        rollups: [],
        steps: [],
        counts: {},
        errors: 0,
        tools: 0,
        tokens: { committed: zeroUsage(), provisional: {}, turnsDone: [] },
    };
}
function planBatch(session, batch) {
    var _a, _b;
    var plan = {
        byLane: new Map(),
        newLanes: new Map(),
        colorNext: session.colorNext,
        toolUse: new Map(),
        workflows: {},
        dropped: 0,
    };
    var kept = [];
    batch.forEach(function (ev, i) {
        if (ev.epoch === session.epoch)
            kept.push({ ev: ev, i: i });
        else
            plan.dropped++;
    });
    kept.sort(function (a, b) { return a.ev.at - b.ev.at || a.i - b.i; });
    var lane = function (key) {
        var list = plan.byLane.get(key);
        if (!list)
            plan.byLane.set(key, (list = []));
        if (!session.digests[key] && !plan.newLanes.has(key)) {
            plan.newLanes.set(key, key === 'main' ? -1 : plan.colorNext++ % PALETTE);
        }
        return list;
    };
    var link = function (id, key) {
        var _a;
        var keys = (_a = plan.toolUse.get(id)) !== null && _a !== void 0 ? _a : [];
        if (!keys.includes(key))
            keys.push(key);
        plan.toolUse.set(id, keys);
    };
    for (var _i = 0, kept_1 = kept; _i < kept_1.length; _i++) {
        var ev = kept_1[_i].ev;
        lane(ev.lane).push(ev);
        if (ev.t === 'spawned' && ev.meta.toolUseId)
            link(ev.meta.toolUseId, ev.lane);
        if (ev.t === 'tool-end') {
            if (ev.child) {
                link(ev.id, ev.child);
                lane(ev.child).push({
                    t: 'child-report',
                    epoch: ev.epoch,
                    at: ev.at,
                    lane: ev.child,
                    tokens: (_a = ev.childTotals) === null || _a === void 0 ? void 0 : _a.tokens,
                    launch: ev.launch,
                });
            }
            if (ev.workflow) {
                var prev = plan.workflows[ev.workflow.runId];
                var name_1 = (_b = prev === null || prev === void 0 ? void 0 : prev.name) !== null && _b !== void 0 ? _b : ev.workflow.name;
                plan.workflows[ev.workflow.runId] = name_1 ? { name: name_1 } : {};
            }
        }
    }
    return plan;
}
// ---- one lane -----------------------------------------------------------
var hasOpenRun = function (l) { return l.runs.some(function (r) { return r.end === undefined; }); };
function lastRunEnd(l) {
    var end;
    for (var _i = 0, _a = l.runs; _i < _a.length; _i++) {
        var r = _a[_i];
        if (r.end !== undefined && (end === undefined || r.end > end))
            end = r.end;
    }
    return end;
}
/** Close everything still open at `at`; spans are marked only when the turn was cut short. */
function closeAll(l, at, interrupted, turnId) {
    if (interrupted === void 0) { interrupted = false; }
    for (var _i = 0, _a = l.spans; _i < _a.length; _i++) {
        var s = _a[_i];
        if (s.end !== undefined)
            continue;
        s.end = Math.max(at, s.start);
        if (interrupted)
            s.isInterrupted = true;
    }
    for (var _b = 0, _c = l.steps; _b < _c.length; _b++) {
        var s = _c[_b];
        if (s.end === undefined && (turnId === undefined || s.turnId === turnId))
            s.end = Math.max(at, s.start);
    }
    for (var _d = 0, _e = l.runs; _d < _e.length; _d++) {
        var r = _e[_d];
        if (r.end === undefined)
            r.end = Math.max(at, r.start);
    }
}
/** An activity event: wake a dormant lane, make sure a live one has an open run. */
function touch(l, at, force) {
    var _a;
    if (force === void 0) { force = false; }
    if (isTerminal(l.status) || l.status === 'idle') {
        var since = (_a = l.endedAt) !== null && _a !== void 0 ? _a : lastRunEnd(l);
        if (force || since === undefined || at > since) {
            l.status = 'running';
            delete l.endedAt;
        }
    }
    else if (l.status === 'pending') {
        l.status = 'running';
    }
    delete l.quiet;
    delete l.missingSince;
    if (!isTerminal(l.status) && l.status !== 'idle' && !hasOpenRun(l))
        l.runs.push({ start: at });
}
function count(l, kind, isError) {
    var _a;
    l.counts[kind] = ((_a = l.counts[kind]) !== null && _a !== void 0 ? _a : 0) + 1;
    l.tools++;
    if (isError)
        l.errors++;
}
function findSpan(l, id) {
    for (var i = l.spans.length - 1; i >= 0; i--)
        if (l.spans[i].id === id)
            return l.spans[i];
    return undefined;
}
function insertSpan(l, span) {
    var i = l.spans.length;
    while (i > 0 && l.spans[i - 1].start > span.start)
        i--;
    l.spans.splice(i, 0, span);
}
function mergeRollups(a, b) {
    var _a;
    var counts = __assign({}, a.counts);
    for (var _i = 0, _b = Object.entries(b.counts); _i < _b.length; _i++) {
        var _c = _b[_i], k = _c[0], n = _c[1];
        counts[k] = ((_a = counts[k]) !== null && _a !== void 0 ? _a : 0) + (n !== null && n !== void 0 ? n : 0);
    }
    return { start: Math.min(a.start, b.start), end: Math.max(a.end, b.end), counts: counts, errors: a.errors + b.errors };
}
function applyCaps(l) {
    var _a, _b;
    var _loop_1 = function () {
        var take = [];
        for (var i = 0; i < l.spans.length && take.length < exports.CAPS.rollupChunk; i++) {
            if (l.spans[i].end !== undefined)
                take.push(i);
        }
        if (!take.length)
            return "break";
        var chunk = take.map(function (i) { return l.spans[i]; });
        var roll = { start: Infinity, end: -Infinity, counts: {}, errors: 0 };
        for (var _i = 0, chunk_1 = chunk; _i < chunk_1.length; _i++) {
            var s = chunk_1[_i];
            roll.start = Math.min(roll.start, s.start);
            roll.end = Math.max(roll.end, (_a = s.end) !== null && _a !== void 0 ? _a : s.start);
            roll.counts[s.kind] = ((_b = roll.counts[s.kind]) !== null && _b !== void 0 ? _b : 0) + 1;
            if (s.isError)
                roll.errors++;
        }
        var gone = new Set(take);
        l.spans = l.spans.filter(function (_, i) { return !gone.has(i); });
        l.rollups.push(roll);
    };
    while (l.spans.length > exports.CAPS.spans) {
        var state_1 = _loop_1();
        if (state_1 === "break")
            break;
    }
    while (l.rollups.length > exports.CAPS.rollups) {
        var pairs = Math.min(l.rollups.length - exports.CAPS.rollups, Math.floor(l.rollups.length / 2));
        var merged = [];
        for (var i = 0; i < pairs; i++)
            merged.push(mergeRollups(l.rollups[2 * i], l.rollups[2 * i + 1]));
        l.rollups = merged.concat(l.rollups.slice(pairs * 2));
    }
    if (l.steps.length > exports.CAPS.steps) {
        var excess_1 = l.steps.length - exports.CAPS.steps;
        l.steps = l.steps.filter(function (s) {
            if (excess_1 > 0 && s.end !== undefined) {
                excess_1--;
                return false;
            }
            return true;
        });
    }
}
function setList(l, status) {
    if (status === 'completed' || status === 'failed' || status === 'killed') {
        if (!isTerminal(l.status) || l.status === 'lost') {
            l.status = status;
            l.endedAt = l.lastAt;
            delete l.quiet;
            closeAll(l, l.endedAt);
        }
        return;
    }
    // The list lags: it never reopens a finished lane or demotes a running one to pending.
    // ...except `lost`, our own guess, which the list may contradict.
    if ((isTerminal(l.status) && l.status !== 'lost') || l.status === 'remote')
        return;
    if (l.status === 'lost')
        delete l.endedAt;
    if (status === 'pending' && l.status !== 'pending')
        return;
    l.status = status;
}
function apply(l, ev, now) {
    var _a, _b, _c, _d, _e, _f;
    switch (ev.t) {
        case 'spawned': {
            var meta = __assign({}, ((_a = l.meta) !== null && _a !== void 0 ? _a : {}));
            for (var _i = 0, _g = Object.entries(ev.meta); _i < _g.length; _i++) {
                var _h = _g[_i], k = _h[0], v = _h[1];
                if (v !== undefined)
                    meta[k] = v;
            }
            l.meta = meta;
            l.spawnedAt = ev.at;
            touch(l, ev.at);
            if (l.meta.run)
                delete l.missingSince;
            return;
        }
        case 'tool-start': {
            touch(l, ev.at);
            if (findSpan(l, ev.id))
                return;
            insertSpan(l, { id: ev.id, kind: ev.kind, tool: ev.tool, summary: ev.summary, start: ev.at });
            count(l, ev.kind, false);
            return;
        }
        case 'tool-end': {
            touch(l, ev.at);
            var span = findSpan(l, ev.id);
            if (!span) {
                span = { id: ev.id, kind: ev.kind, tool: ev.tool, summary: ev.summary, start: Math.min(ev.startedAt, ev.at) };
                insertSpan(l, span);
                count(l, ev.kind, false);
            }
            span.end = Math.max(ev.at, span.start);
            if (ev.isError && !span.isError) {
                span.isError = true;
                l.errors++;
            }
            if (ev.isInterrupted)
                span.isInterrupted = true;
            if (ev.child)
                span.child = ev.child;
            return;
        }
        case 'child-report': {
            if (ev.tokens !== undefined)
                l.tokens.fallback = ev.tokens;
            if (ev.launch === 'remote' && !isTerminal(l.status))
                l.status = 'remote';
            return;
        }
        case 'step-start': {
            touch(l, ev.at);
            if (!l.steps.some(function (s) { return s.turnId === ev.turnId && s.index === ev.index; })) {
                l.steps.push({ turnId: ev.turnId, index: ev.index, start: ev.at });
            }
            return;
        }
        case 'step-end': {
            var step = l.steps.find(function (s) { return s.turnId === ev.turnId && s.index === ev.index; });
            if (step && step.end === undefined)
                step.end = Math.max(ev.at, step.start);
            if (ev.usage && !l.tokens.turnsDone.includes(ev.turnId)) {
                l.tokens.provisional["".concat(ev.turnId, ":").concat(ev.index)] = ev.usage;
            }
            return;
        }
        case 'turn-start': {
            touch(l, ev.at, true);
            l.status = 'running';
            return;
        }
        case 'say': {
            // Display only: never reopens a finished lane.
            if (isTerminal(l.status))
                return;
            l.live = { kind: ev.kind, text: ev.text, at: ev.at };
            return;
        }
        case 'turn-complete': {
            if (l.tokens.turnsDone.includes(ev.turnId))
                return;
            delete l.live;
            var prefix = "".concat(ev.turnId, ":");
            var sum = zeroUsage();
            for (var _j = 0, _k = Object.entries(l.tokens.provisional); _j < _k.length; _j++) {
                var _l = _k[_j], k = _l[0], u = _l[1];
                if (!k.startsWith(prefix))
                    continue;
                sum = addUsage(sum, u);
                delete l.tokens.provisional[k];
            }
            l.tokens.committed = addUsage(l.tokens.committed, (_b = ev.usage) !== null && _b !== void 0 ? _b : sum);
            l.tokens.turnsDone = __spreadArray(__spreadArray([], l.tokens.turnsDone, true), [ev.turnId], false).slice(-exports.CAPS.turnsDone);
            closeAll(l, ev.at, ev.reason === 'aborted' || ev.reason === 'error', ev.turnId);
            if (ev.answer)
                l.answer = (0, format_1.clip)(ev.answer, exports.CAPS.answer);
            if (l.key === 'main' || ((_c = l.meta) === null || _c === void 0 ? void 0 : _c.isTeammate)) {
                l.status = 'idle';
            }
            else {
                l.status = ev.reason === 'answer' ? 'completed' : ev.reason === 'aborted' ? 'killed' : 'failed';
                l.endedAt = ev.at;
            }
            return;
        }
        case 'listed': {
            l.listed = true;
            delete l.missingSince;
            if (ev.adopt && !l.meta)
                l.meta = ev.adopt;
            if (ev.status !== 'lost' && ev.status !== 'remote')
                setList(l, ev.status);
            return;
        }
        case 'unlisted': {
            if (((_d = l.meta) === null || _d === void 0 ? void 0 : _d.run) || ((_e = l.meta) === null || _e === void 0 ? void 0 : _e.isFork)) {
                if (!isTerminal(l.status) && now - l.lastAt > exports.CAPS.quietAfterMs)
                    l.quiet = true;
                return;
            }
            l.missingSince = (_f = l.missingSince) !== null && _f !== void 0 ? _f : ev.at;
            if (!isTerminal(l.status) && l.status !== 'remote' && ev.at - l.missingSince >= exports.CAPS.lostAfterMs) {
                l.status = 'lost';
                l.endedAt = l.lastAt;
                closeAll(l, l.lastAt);
            }
            return;
        }
    }
}
function reduceLane(lane, events, ctx) {
    var first = events.length ? Math.min.apply(Math, events.map(function (e) { return e.at; })) : ctx.now;
    var l = lane ? JSON.parse(JSON.stringify(lane)) : emptyLane(ctx.key, ctx.epoch, ctx.color, first);
    for (var _i = 0, events_1 = events; _i < events_1.length; _i++) {
        var ev = events_1[_i];
        l.firstAt = Math.min(l.firstAt, ev.at);
        if (ev.t !== 'listed' && ev.t !== 'unlisted')
            l.lastAt = Math.max(l.lastAt, ev.at);
        apply(l, ev, ctx.now);
        applyCaps(l);
    }
    return l;
}
// ---- digest, order, session ----------------------------------------------
function digestOf(lane, depth) {
    var _a, _b;
    var meta = lane.meta;
    var main = lane.key === 'main';
    var last;
    for (var _i = 0, _c = lane.spans; _i < _c.length; _i++) {
        var s = _c[_i];
        var better = !last || (s.end === undefined) > (last.end === undefined) || ((s.end === undefined) === (last.end === undefined) && s.start >= last.start);
        if (better)
            last = s;
    }
    var d = {
        key: lane.key,
        label: (0, format_1.label)(meta, lane.key),
        type: main ? 'main' : ((_a = meta === null || meta === void 0 ? void 0 : meta.type) !== null && _a !== void 0 ? _a : ''),
        status: lane.status,
        color: lane.color,
        depth: depth,
        startedAt: (_b = lane.spawnedAt) !== null && _b !== void 0 ? _b : lane.firstAt,
        lastAt: lane.lastAt,
        tokens: totalTokens(lane.tokens),
        cached: cachedTokens(lane.tokens),
        tools: lane.tools,
        errors: lane.errors,
        mix: __assign({}, lane.counts),
    };
    if (meta === null || meta === void 0 ? void 0 : meta.model)
        d.model = meta.model;
    if (!main && (meta === null || meta === void 0 ? void 0 : meta.parent))
        d.parent = meta.parent;
    if (meta === null || meta === void 0 ? void 0 : meta.run)
        d.run = meta.run;
    if (lane.endedAt !== undefined)
        d.endedAt = lane.endedAt;
    if (last)
        d.last = { kind: last.kind, summary: last.summary, at: last.start };
    if (lane.quiet)
        d.quiet = true;
    if (!main && !meta)
        d.hidden = true;
    return d;
}
function laneOrder(digests) {
    var _a;
    var visible = Object.values(digests).filter(function (d) { return !d.hidden; });
    var has = new Set(visible.map(function (d) { return d.key; }));
    var hasMain = has.has('main');
    var kids = new Map();
    var roots = [];
    for (var _i = 0, visible_1 = visible; _i < visible_1.length; _i++) {
        var d = visible_1[_i];
        if (d.key === 'main')
            continue;
        var p = d.parent && d.parent !== d.key && has.has(d.parent) ? d.parent : hasMain ? 'main' : undefined;
        if (p === undefined)
            roots.push(d);
        else
            kids.set(p, __spreadArray(__spreadArray([], ((_a = kids.get(p)) !== null && _a !== void 0 ? _a : []), true), [d], false));
    }
    var byStart = function (a, b) { return a.startedAt - b.startedAt || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0); };
    // Siblings of one workflow run stay together, placed where the run's first agent starts.
    var arrange = function (list) {
        var runs = new Map();
        var items = [];
        for (var _i = 0, _a = __spreadArray([], list, true).sort(byStart); _i < _a.length; _i++) {
            var d = _a[_i];
            if (!d.run) {
                items.push({ at: d.startedAt, key: d.key, members: [d] });
                continue;
            }
            var group = runs.get(d.run);
            if (!group) {
                runs.set(d.run, (group = []));
                items.push({ at: d.startedAt, key: d.key, members: group });
            }
            group.push(d);
        }
        items.sort(function (a, b) { return a.at - b.at || (a.key < b.key ? -1 : 1); });
        return items.flatMap(function (i) { return i.members; });
    };
    var order = [];
    var depth = {};
    var seen = new Set();
    var walk = function (d, level) {
        var _a;
        if (seen.has(d.key))
            return;
        seen.add(d.key);
        order.push(d.key);
        depth[d.key] = level;
        for (var _i = 0, _b = arrange((_a = kids.get(d.key)) !== null && _a !== void 0 ? _a : []); _i < _b.length; _i++) {
            var c = _b[_i];
            walk(c, level + 1);
        }
    };
    var main = digests['main'];
    if (main && hasMain)
        walk(main, 0);
    for (var _b = 0, _c = arrange(roots); _b < _c.length; _b++) {
        var r = _c[_b];
        walk(r, 0);
    }
    // Parent cycles are unreachable from any root: show them at the top level instead of losing them.
    for (var _d = 0, _e = __spreadArray([], visible, true).sort(byStart); _d < _e.length; _d++) {
        var d = _e[_d];
        walk(d, hasMain ? 1 : 0);
    }
    for (var _f = 0, _g = Object.values(digests); _f < _g.length; _f++) {
        var d = _g[_f];
        if (!(d.key in depth))
            depth[d.key] = 0;
    }
    return { order: order, depth: depth };
}
function reduceSession(session, changed, plan, now) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
    var digests = __assign({}, session.digests);
    for (var _i = 0, changed_1 = changed; _i < changed_1.length; _i++) {
        var l = changed_1[_i];
        digests[l.key] = digestOf(l, (_b = (_a = digests[l.key]) === null || _a === void 0 ? void 0 : _a.depth) !== null && _b !== void 0 ? _b : 0);
    }
    var workflows = __assign({}, session.workflows);
    var addRun = function (runId, name) {
        var prev = workflows[runId];
        if (prev) {
            if (!prev.name && name)
                workflows[runId] = __assign(__assign({}, prev), { name: name });
        }
        else {
            workflows[runId] = __assign(__assign({}, (name ? { name: name } : {})), { at: now, ordinal: Object.keys(workflows).length + 1 });
        }
    };
    for (var _q = 0, _r = Object.entries(plan.workflows); _q < _r.length; _q++) {
        var _s = _r[_q], runId = _s[0], w = _s[1];
        addRun(runId, w.name);
    }
    for (var _t = 0, changed_2 = changed; _t < changed_2.length; _t++) {
        var l = changed_2[_t];
        if ((_c = l.meta) === null || _c === void 0 ? void 0 : _c.run)
            addRun(l.meta.run);
    }
    var archived = __assign({}, session.archived);
    var evict = [];
    var drop = function (key) {
        var _a = digests, _b = key, _gone = _a[_b], rest = __rest(_a, [typeof _b === "symbol" ? _b : _b + ""]);
        digests = rest;
        evict.push(key);
    };
    for (var _u = 0, _v = Object.values(digests); _u < _v.length; _u++) {
        var d = _v[_u];
        if (d.hidden && (d.status === 'lost' || now - ((_d = d.lastAt) !== null && _d !== void 0 ? _d : d.startedAt) > exports.CAPS.hiddenGcMs))
            drop(d.key);
    }
    while (Object.keys(digests).length > exports.CAPS.lanes) {
        var oldest = void 0;
        for (var _w = 0, _x = Object.values(digests); _w < _x.length; _w++) {
            var d = _x[_w];
            if (d.key === 'main' || !isTerminal(d.status))
                continue;
            if (!oldest || ((_f = (_e = d.endedAt) !== null && _e !== void 0 ? _e : d.lastAt) !== null && _f !== void 0 ? _f : 0) < ((_h = (_g = oldest.endedAt) !== null && _g !== void 0 ? _g : oldest.lastAt) !== null && _h !== void 0 ? _h : 0))
                oldest = d;
        }
        if (!oldest)
            break;
        archived.lanes++;
        archived.tokens += oldest.tokens;
        archived.cached = ((_j = archived.cached) !== null && _j !== void 0 ? _j : 0) + ((_k = oldest.cached) !== null && _k !== void 0 ? _k : 0);
        archived.tools += oldest.tools;
        archived.errors += oldest.errors;
        drop(oldest.key);
    }
    var _y = laneOrder(digests), order = _y.order, depth = _y.depth;
    var live = 0;
    var done = 0;
    var failed = 0;
    var totals = { tokens: archived.tokens, cached: (_l = archived.cached) !== null && _l !== void 0 ? _l : 0, tools: archived.tools, errors: archived.errors };
    var next = {};
    for (var _z = 0, _0 = Object.entries(digests); _z < _0.length; _z++) {
        var _1 = _0[_z], key = _1[0], d = _1[1];
        next[key] = d.depth === ((_m = depth[key]) !== null && _m !== void 0 ? _m : 0) ? d : __assign(__assign({}, d), { depth: (_o = depth[key]) !== null && _o !== void 0 ? _o : 0 });
        totals.tokens += d.tokens;
        totals.cached += (_p = d.cached) !== null && _p !== void 0 ? _p : 0;
        totals.tools += d.tools;
        totals.errors += d.errors;
        if (key === 'main' || d.hidden)
            continue;
        if (isLive(d.status) && !d.quiet)
            live++;
        else if (d.status === 'completed')
            done++;
        else if (d.status === 'failed' || d.status === 'killed' || d.status === 'lost')
            failed++;
    }
    var lastEventAt = session.lastEventAt;
    var firstSpawnAt = session.firstSpawnAt;
    for (var _2 = 0, changed_3 = changed; _2 < changed_3.length; _2++) {
        var l = changed_3[_2];
        lastEventAt = Math.max(lastEventAt, l.lastAt);
        if (l.spawnedAt !== undefined)
            firstSpawnAt = Math.min(firstSpawnAt !== null && firstSpawnAt !== void 0 ? firstSpawnAt : l.spawnedAt, l.spawnedAt);
    }
    var out = __assign(__assign({}, session), { order: order, digests: next, workflows: workflows, colorNext: plan.colorNext, live: live, done: done, failed: failed, archived: archived, totals: totals, lastEventAt: lastEventAt });
    if (firstSpawnAt !== undefined)
        out.firstSpawnAt = firstSpawnAt;
    return { session: out, evict: evict };
}
// ---- reconcile -----------------------------------------------------------
function mapStatus(s) {
    var x = s.toLowerCase();
    if (x.startsWith('complet') || x === 'done' || x === 'success')
        return 'completed';
    if (x.startsWith('fail') || x === 'error')
        return 'failed';
    if (x.startsWith('kill') || x.startsWith('cancel') || x.startsWith('stop'))
        return 'killed';
    if (x.startsWith('wait') || x.startsWith('block'))
        return 'waiting';
    if (x.startsWith('pend') || x.startsWith('queue'))
        return 'pending';
    if (x === 'idle')
        return 'idle';
    return 'running';
}
/** Synthetic events for one $.agent.list() pass; the reducer decides what they mean. */
function reconcileEvents(session, list, now) {
    var _a;
    var base = { epoch: session.epoch, at: now };
    var out = [];
    var seen = new Set();
    for (var _i = 0, list_1 = list; _i < list_1.length; _i++) {
        var item = list_1[_i];
        seen.add(item.id);
        var known = session.digests[item.id];
        var ev = __assign(__assign({}, base), { t: 'listed', lane: item.id, status: mapStatus(item.status) });
        if (!known || known.hidden) {
            ev.adopt = __assign(__assign({ description: item.description, type: item.type }, (item.name ? { name: item.name } : {})), { parent: (_a = item.parentId) !== null && _a !== void 0 ? _a : 'main' });
        }
        out.push(ev);
    }
    for (var _b = 0, _c = Object.values(session.digests); _b < _c.length; _b++) {
        var d = _c[_b];
        if (d.key === 'main' || seen.has(d.key) || isTerminal(d.status) || d.status === 'remote')
            continue;
        out.push(__assign(__assign({}, base), { t: 'unlisted', lane: d.key }));
    }
    return out;
}
