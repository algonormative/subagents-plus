"use strict";
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
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
var testing_1 = require("claude-code/testing");
var model_1 = require("./model");
var EP = 1;
var T0 = 1000000;
// ---- fixtures -------------------------------------------------------------
var use = function (n) { return ({ input: n, output: 0, cacheRead: 0, cacheWrite: 0 }); };
var meta = function (description, extra) {
    if (extra === void 0) { extra = {}; }
    return (__assign({ description: description, type: 'general-purpose', parent: 'main' }, extra));
};
var spawned = function (lane, at, m, epoch) {
    if (epoch === void 0) { epoch = EP; }
    return ({ t: 'spawned', epoch: epoch, at: at, lane: lane, meta: m });
};
var toolStart = function (lane, id, at, kind) {
    if (kind === void 0) { kind = 'read'; }
    return ({
        t: 'tool-start', epoch: EP,
        at: at,
        lane: lane,
        id: id,
        tool: 'T',
        kind: kind,
        summary: "s-".concat(id),
    });
};
var toolEnd = function (lane, id, at, startedAt, extra) {
    if (extra === void 0) { extra = {}; }
    return (__assign({ t: 'tool-end', epoch: EP, at: at, lane: lane, id: id, tool: 'T', kind: 'read', summary: "s-".concat(id), startedAt: startedAt, isError: false }, extra));
};
var stepStart = function (lane, turnId, index, at) { return ({
    t: 'step-start', epoch: EP,
    at: at,
    lane: lane,
    turnId: turnId,
    index: index,
    model: 'm',
}); };
var stepEnd = function (lane, turnId, index, at, usage) { return ({
    t: 'step-end', epoch: EP,
    at: at,
    lane: lane,
    turnId: turnId,
    index: index,
    usage: usage,
}); };
var complete = function (lane, turnId, at, usage, reason) {
    if (reason === void 0) { reason = 'answer'; }
    return ({
        t: 'turn-complete', epoch: EP,
        at: at,
        lane: lane,
        turnId: turnId,
        reason: reason,
        durationMs: 0,
        usage: usage,
        answer: reason === 'answer' ? 'done' : '',
    });
};
var listed = function (lane, at, status) { return ({ t: 'listed', epoch: EP, at: at, lane: lane, status: status }); };
var unlisted = function (lane, at) { return ({ t: 'unlisted', epoch: EP, at: at, lane: lane }); };
/** Reduce one lane's events on their own, the way register.tsx would per lane. */
var lane = function (events, key, prior, now) {
    if (key === void 0) { key = 'agent-0001'; }
    if (prior === void 0) { prior = null; }
    if (now === void 0) { now = T0 + 10000000; }
    return (0, model_1.reduceLane)(prior, events, { key: key, epoch: EP, color: 0, now: now });
};
var world = function (epoch) {
    if (epoch === void 0) { epoch = EP; }
    return ({ session: (0, model_1.emptySession)(epoch, T0), lanes: {}, evict: [], dropped: 0 });
};
/** The whole pipeline: planBatch -> reduceLane per lane -> reduceSession. */
function feed(w, batch, now) {
    var _a, _b, _c, _d;
    if (now === void 0) { now = Math.max.apply(Math, __spreadArray([T0], batch.map(function (e) { return e.at; }), false)) + 1; }
    var plan = (0, model_1.planBatch)(w.session, batch);
    var lanes = __assign({}, w.lanes);
    var changed = [];
    for (var _i = 0, _e = plan.byLane; _i < _e.length; _i++) {
        var _f = _e[_i], key = _f[0], events = _f[1];
        var color = (_c = (_a = plan.newLanes.get(key)) !== null && _a !== void 0 ? _a : (_b = w.session.digests[key]) === null || _b === void 0 ? void 0 : _b.color) !== null && _c !== void 0 ? _c : 0;
        lanes[key] = (0, model_1.reduceLane)((_d = lanes[key]) !== null && _d !== void 0 ? _d : null, events, { key: key, epoch: w.session.epoch, color: color, now: now });
        changed.push(lanes[key]);
    }
    var out = (0, model_1.reduceSession)(w.session, changed, plan, now);
    for (var _g = 0, _h = out.evict; _g < _h.length; _g++) {
        var key = _h[_g];
        delete lanes[key];
    }
    return { session: out.session, lanes: lanes, evict: out.evict, dropped: plan.dropped };
}
// ---- lifecycle ------------------------------------------------------------
(0, testing_1.test)('spawn, tools, complete', function () { return __awaiter(void 0, void 0, void 0, function () {
    var w, l, d;
    var _a;
    return __generator(this, function (_b) {
        w = feed(world(), [
            spawned('agent-aaaa', T0 + 100, meta('Scan the repo', { toolUseId: 'tu1' })),
            toolStart('agent-aaaa', 't1', T0 + 200),
            toolEnd('agent-aaaa', 't1', T0 + 300, T0 + 200),
            toolStart('agent-aaaa', 't2', T0 + 400, 'bash'),
            toolEnd('agent-aaaa', 't2', T0 + 500, T0 + 400, { kind: 'bash', isError: true }),
            stepStart('agent-aaaa', 'T1', 0, T0 + 150),
            stepEnd('agent-aaaa', 'T1', 0, T0 + 450, use(120)),
            complete('agent-aaaa', 'T1', T0 + 1100, use(150)),
        ]);
        l = w.lanes['agent-aaaa'];
        (0, testing_1.expect)(l.status).toBe('completed');
        (0, testing_1.expect)(l.endedAt).toBe(T0 + 1100);
        (0, testing_1.expect)(l.endedAt - l.spawnedAt).toBe(1000);
        (0, testing_1.expect)(l.counts).toEqual({ read: 1, bash: 1 });
        (0, testing_1.expect)([l.tools, l.errors]).toEqual([2, 1]);
        (0, testing_1.expect)(l.spans.map(function (s) { return s.end !== undefined; })).toEqual([true, true]);
        (0, testing_1.expect)(l.answer).toBe('done');
        d = w.session.digests['agent-aaaa'];
        (0, testing_1.expect)([d.label, d.tokens, d.status, (_a = d.last) === null || _a === void 0 ? void 0 : _a.summary]).toEqual(['Scan the repo', 150, 'completed', 's-t2']);
        (0, testing_1.expect)([w.session.live, w.session.done, w.session.failed]).toEqual([0, 1, 0]);
        (0, testing_1.expect)(w.session.totals).toEqual({ tokens: 150, cached: 0, tools: 2, errors: 1 });
        (0, testing_1.expect)(w.session.firstSpawnAt).toBe(T0 + 100);
        return [2 /*return*/];
    });
}); });
(0, testing_1.test)('events for a lane before its spawn: hidden, then filled in', function () { return __awaiter(void 0, void 0, void 0, function () {
    var w, d;
    return __generator(this, function (_a) {
        w = feed(world(), [toolStart('agent-bbbb', 't1', T0 + 10), toolEnd('agent-bbbb', 't1', T0 + 20, T0 + 10)]);
        (0, testing_1.expect)(w.session.digests['agent-bbbb'].hidden).toBe(true);
        (0, testing_1.expect)(w.session.order).toEqual([]);
        w = feed(w, [spawned('agent-bbbb', T0 + 30, meta('Late spawn'))]);
        d = w.session.digests['agent-bbbb'];
        (0, testing_1.expect)(d.hidden).toBeUndefined();
        (0, testing_1.expect)(d.label).toBe('Late spawn');
        (0, testing_1.expect)(w.lanes['agent-bbbb'].tools).toBe(1);
        (0, testing_1.expect)(w.session.order).toEqual(['agent-bbbb']);
        return [2 /*return*/];
    });
}); });
(0, testing_1.test)('tool-end before tool-start makes one span, counted once', function () { return __awaiter(void 0, void 0, void 0, function () {
    var l;
    return __generator(this, function (_a) {
        l = lane([toolEnd('agent-0001', 't1', T0 + 50, T0 + 10), toolStart('agent-0001', 't1', T0 + 60)]);
        (0, testing_1.expect)(l.spans.length).toBe(1);
        (0, testing_1.expect)(l.spans[0].start).toBe(T0 + 10);
        (0, testing_1.expect)(l.spans[0].end).toBe(T0 + 50);
        (0, testing_1.expect)([l.tools, l.counts.read]).toEqual([1, 1]);
        return [2 /*return*/];
    });
}); });
(0, testing_1.test)('a lane that never completes ends by the list, or is lost, or goes quiet', function () { return __awaiter(void 0, void 0, void 0, function () {
    var running, done, once, lost, wf, early, quiet;
    return __generator(this, function (_a) {
        running = lane([spawned('agent-0001', T0, meta('x')), toolStart('agent-0001', 't1', T0 + 5)]);
        done = lane([listed('agent-0001', T0 + 99000, 'completed')], 'agent-0001', running);
        (0, testing_1.expect)(done.status).toBe('completed');
        (0, testing_1.expect)(done.endedAt).toBe(T0 + 5);
        (0, testing_1.expect)(done.spans[0].end).toBe(T0 + 5);
        (0, testing_1.expect)(done.spans[0].isInterrupted).toBeUndefined();
        once = lane([unlisted('agent-0001', T0 + 10000)], 'agent-0001', running);
        (0, testing_1.expect)(once.status).toBe('running');
        (0, testing_1.expect)(once.missingSince).toBe(T0 + 10000);
        lost = lane([unlisted('agent-0001', T0 + 40000)], 'agent-0001', once);
        (0, testing_1.expect)(lost.status).toBe('lost');
        (0, testing_1.expect)(lost.endedAt).toBe(T0 + 5);
        wf = lane([spawned('agent-0002', T0, meta('wf', { run: 'run-xyz' })), toolStart('agent-0002', 't1', T0 + 5)], 'agent-0002');
        early = lane([unlisted('agent-0002', T0 + 60000)], 'agent-0002', wf, T0 + 60000);
        (0, testing_1.expect)(early.quiet).toBeUndefined();
        quiet = lane([unlisted('agent-0002', T0 + 700000)], 'agent-0002', wf, T0 + 700000);
        (0, testing_1.expect)(quiet.quiet).toBe(true);
        (0, testing_1.expect)(quiet.status).toBe('running');
        (0, testing_1.expect)(quiet.endedAt).toBeUndefined();
        (0, testing_1.expect)(quiet.missingSince).toBeUndefined();
        return [2 /*return*/];
    });
}); });
(0, testing_1.test)('an aborted turn closes open spans as interrupted and commits provisional tokens', function () { return __awaiter(void 0, void 0, void 0, function () {
    var l;
    return __generator(this, function (_a) {
        l = lane([
            spawned('agent-0001', T0, meta('x')),
            stepStart('agent-0001', 'T1', 0, T0 + 1),
            stepEnd('agent-0001', 'T1', 0, T0 + 2, use(120)),
            toolStart('agent-0001', 't1', T0 + 3),
            complete('agent-0001', 'T1', T0 + 9, undefined, 'aborted'),
        ]);
        (0, testing_1.expect)(l.status).toBe('killed');
        (0, testing_1.expect)(l.spans[0].isInterrupted).toBe(true);
        (0, testing_1.expect)(l.spans[0].end).toBe(T0 + 9);
        (0, testing_1.expect)((0, model_1.totalTokens)(l.tokens)).toBe(120);
        (0, testing_1.expect)(l.tokens.provisional).toEqual({});
        (0, testing_1.expect)(l.runs.every(function (r) { return r.end !== undefined; })).toBe(true);
        return [2 /*return*/];
    });
}); });
(0, testing_1.test)('a main-loop error turn leaves main idle', function () { return __awaiter(void 0, void 0, void 0, function () {
    var w, m;
    return __generator(this, function (_a) {
        w = feed(world(), [
            { t: 'turn-start', epoch: EP, at: T0 + 1, lane: 'main', turnId: 'M1' },
            toolStart('main', 't1', T0 + 2),
            complete('main', 'M1', T0 + 9, undefined, 'error'),
        ]);
        m = w.lanes['main'];
        (0, testing_1.expect)(m.status).toBe('idle');
        (0, testing_1.expect)(m.endedAt).toBeUndefined();
        (0, testing_1.expect)(m.spans[0].isInterrupted).toBe(true);
        (0, testing_1.expect)(m.color).toBe(-1);
        (0, testing_1.expect)([w.session.digests['main'].status, w.session.live]).toEqual(['idle', 0]);
        return [2 /*return*/];
    });
}); });
(0, testing_1.test)('a finished lane reopens on later activity with a second run', function () { return __awaiter(void 0, void 0, void 0, function () {
    var done, late, again;
    return __generator(this, function (_a) {
        done = lane([spawned('agent-0001', T0, meta('x')), complete('agent-0001', 'T1', T0 + 200, use(5))]);
        (0, testing_1.expect)(done.status).toBe('completed');
        late = lane([toolStart('agent-0001', 'old', T0 + 150)], 'agent-0001', done);
        (0, testing_1.expect)(late.status).toBe('completed');
        again = lane([toolStart('agent-0001', 't2', T0 + 300)], 'agent-0001', done);
        (0, testing_1.expect)(again.status).toBe('running');
        (0, testing_1.expect)(again.endedAt).toBeUndefined();
        (0, testing_1.expect)(again.runs.length).toBe(2);
        (0, testing_1.expect)(again.runs[0].end).toBe(T0 + 200);
        (0, testing_1.expect)(again.runs[1]).toEqual({ start: T0 + 300 });
        (0, testing_1.expect)(done.status).toBe('completed'); // the input was not mutated
        return [2 /*return*/];
    });
}); });
(0, testing_1.test)('remote launches are neither live nor lost', function () { return __awaiter(void 0, void 0, void 0, function () {
    var w, later;
    return __generator(this, function (_a) {
        w = feed(world(), [spawned('agent-rem1', T0, meta('far away'))]);
        w = feed(w, [toolEnd('main', 'tu1', T0 + 5, T0, { tool: 'Agent', kind: 'agent', child: 'agent-rem1', launch: 'remote' })]);
        (0, testing_1.expect)(w.lanes['agent-rem1'].status).toBe('remote');
        (0, testing_1.expect)((0, model_1.isLive)(w.session.digests['agent-rem1'].status)).toBe(false);
        (0, testing_1.expect)(w.session.live).toBe(0);
        later = lane([unlisted('agent-rem1', T0 + 90000), unlisted('agent-rem1', T0 + 200000)], 'agent-rem1', w.lanes['agent-rem1']);
        (0, testing_1.expect)(later.status).toBe('remote');
        return [2 /*return*/];
    });
}); });
// ---- tokens ---------------------------------------------------------------
(0, testing_1.test)('tokens are never counted twice', function () { return __awaiter(void 0, void 0, void 0, function () {
    var l, tm, mate;
    return __generator(this, function (_a) {
        l = lane([
            spawned('agent-0001', T0, meta('x')),
            stepStart('agent-0001', 'T1', 0, T0 + 1),
            stepEnd('agent-0001', 'T1', 0, T0 + 2, use(100)),
            stepEnd('agent-0001', 'T1', 1, T0 + 3, use(200)),
        ]);
        (0, testing_1.expect)((0, model_1.totalTokens)(l.tokens)).toBe(300); // provisional while running
        l = lane([complete('agent-0001', 'T1', T0 + 4, use(300))], 'agent-0001', l);
        (0, testing_1.expect)((0, model_1.totalTokens)(l.tokens)).toBe(300);
        (0, testing_1.expect)(l.tokens.provisional).toEqual({});
        l = lane([complete('agent-0001', 'T1', T0 + 5, use(300)), stepEnd('agent-0001', 'T1', 2, T0 + 6, use(50))], 'agent-0001', l);
        (0, testing_1.expect)((0, model_1.totalTokens)(l.tokens)).toBe(300); // duplicate complete and a stale step are no-ops
        (0, testing_1.expect)(l.tokens.turnsDone).toEqual(['T1']);
        tm = meta('mate', { isTeammate: true });
        mate = lane([
            spawned('agent-0002', T0, tm),
            complete('agent-0002', 'A', T0 + 10, use(300)),
            complete('agent-0002', 'B', T0 + 20, use(150)),
        ], 'agent-0002');
        (0, testing_1.expect)((0, model_1.usageTotal)(mate.tokens.committed)).toBe(450);
        (0, testing_1.expect)(mate.status).toBe('idle');
        (0, testing_1.expect)(mate.endedAt).toBeUndefined();
        return [2 /*return*/];
    });
}); });
(0, testing_1.test)('a foreground result gives a token fallback until a turn commits', function () { return __awaiter(void 0, void 0, void 0, function () {
    var w, w2;
    return __generator(this, function (_a) {
        w = feed(world(), [
            spawned('agent-0001', T0, meta('x')),
            toolEnd('main', 'tu1', T0 + 9, T0, { tool: 'Agent', kind: 'agent', child: 'agent-0001', childTotals: { tokens: 777, tools: 3, durationMs: 9 }, launch: 'completed' }),
        ]);
        (0, testing_1.expect)(w.session.digests['agent-0001'].tokens).toBe(777);
        (0, testing_1.expect)(w.session.totals.tokens).toBe(777);
        w2 = feed(w, [complete('agent-0001', 'T1', T0 + 10, use(300))]);
        (0, testing_1.expect)(w2.session.digests['agent-0001'].tokens).toBe(300);
        (0, testing_1.expect)(w2.session.totals.tokens).toBe(300);
        return [2 /*return*/];
    });
}); });
// ---- planning and grouping --------------------------------------------------
(0, testing_1.test)('planBatch drops other epochs, assigns colors and routes ids', function () { return __awaiter(void 0, void 0, void 0, function () {
    var s, plan, kinds, many;
    return __generator(this, function (_a) {
        s = (0, model_1.emptySession)(2, T0);
        plan = (0, model_1.planBatch)(s, [
            spawned('old-agent', T0, meta('old'), 1),
            spawned('agent-0002', T0 + 2, meta('b', { toolUseId: 'tu-b' })),
            spawned('agent-0001', T0 + 1, meta('a')),
            toolStart('main', 'x', T0 + 3),
            toolEnd('main', 'tu-a', T0 + 4, T0 + 3, { child: 'agent-0001', launch: 'async' }),
        ].map(function (e) { return (e.lane === 'old-agent' ? e : __assign(__assign({}, e), { epoch: 2 })); }));
        (0, testing_1.expect)(plan.dropped).toBe(1);
        (0, testing_1.expect)(plan.byLane.has('old-agent')).toBe(false);
        (0, testing_1.expect)(__spreadArray([], plan.newLanes.entries(), true)).toEqual([['agent-0001', 0], ['agent-0002', 1], ['main', -1]]);
        (0, testing_1.expect)(plan.colorNext).toBe(2);
        (0, testing_1.expect)(plan.toolUse.get('tu-b')).toEqual(['agent-0002']);
        (0, testing_1.expect)(plan.toolUse.get('tu-a')).toEqual(['agent-0001']);
        kinds = plan.byLane.get('agent-0001').map(function (e) { return e.t; });
        (0, testing_1.expect)(kinds).toEqual(['spawned', 'child-report']);
        many = (0, model_1.planBatch)((0, model_1.emptySession)(EP, T0), Array.from({ length: 9 }, function (_, i) { return spawned("agent-".concat(i), T0 + i, meta('x')); }));
        (0, testing_1.expect)(__spreadArray([], many.newLanes.values(), true)).toEqual([0, 1, 2, 3, 4, 5, 6, 0, 1]);
        return [2 /*return*/];
    });
}); });
(0, testing_1.test)('workflow agents group under the run and the run gets its name', function () { return __awaiter(void 0, void 0, void 0, function () {
    var w, _i, _a, d;
    return __generator(this, function (_b) {
        w = feed(world(), [
            spawned('agent-aaaa', T0 + 100, meta('first', { run: 'run-secret-1' })),
            spawned('agent-cccc', T0 + 150, meta('loner')),
            spawned('agent-bbbb', T0 + 200, meta('second', { run: 'run-secret-1' })),
            toolEnd('main', 'wf1', T0 + 90, T0 + 80, { tool: 'Workflow', kind: 'agent', workflow: { runId: 'run-secret-1', name: 'audit' } }),
        ]);
        (0, testing_1.expect)(w.session.workflows['run-secret-1']).toEqual({ name: 'audit', at: testing_1.expect.any(Number), ordinal: 1 });
        (0, testing_1.expect)(w.session.order).toEqual(['main', 'agent-aaaa', 'agent-bbbb', 'agent-cccc']);
        for (_i = 0, _a = Object.values(w.session.digests); _i < _a.length; _i++) {
            d = _a[_i];
            (0, testing_1.expect)(d.label.includes('run-secret-1')).toBe(false);
        }
        return [2 /*return*/];
    });
}); });
(0, testing_1.test)('nested agents list depth first', function () { return __awaiter(void 0, void 0, void 0, function () {
    var w;
    return __generator(this, function (_a) {
        w = feed(world(), [
            { t: 'turn-start', epoch: EP, at: T0, lane: 'main', turnId: 'M1' },
            spawned('agent-c333', T0 + 30, meta('third', { parent: 'agent-b222' })),
            spawned('agent-a111', T0 + 10, meta('first')),
            spawned('agent-b222', T0 + 20, meta('second', { parent: 'agent-a111' })),
        ]);
        (0, testing_1.expect)(w.session.order).toEqual(['main', 'agent-a111', 'agent-b222', 'agent-c333']);
        (0, testing_1.expect)(w.session.order.map(function (k) { return w.session.digests[k].depth; })).toEqual([0, 1, 2, 3]);
        return [2 /*return*/];
    });
}); });
(0, testing_1.test)('reconcileEvents lists, adopts and flags the missing', function () { return __awaiter(void 0, void 0, void 0, function () {
    var w, evs, byT, adopt;
    return __generator(this, function (_a) {
        w = feed(world(), [
            spawned('agent-aaaa', T0, meta('known')),
            spawned('agent-done', T0, meta('finished')),
            complete('agent-done', 'T1', T0 + 1, use(1)),
            toolStart('agent-hidn', 't', T0 + 2),
            toolStart('agent-gone', 't', T0 + 2),
            spawned('agent-gone', T0 + 2, meta('vanished')),
        ]);
        evs = (0, model_1.reconcileEvents)(w.session, [
            { id: 'agent-aaaa', status: 'running', description: 'known', type: 'x' },
            { id: 'agent-hidn', status: 'running', description: 'adopted', type: 'Explore', parentId: 'agent-aaaa', name: 'scout' },
            { id: 'agent-newb', status: 'completed', description: 'fresh', type: 'x' },
        ], T0 + 50);
        byT = function (t) { return evs.filter(function (e) { return e.t === t; }).map(function (e) { return e.lane; }); };
        (0, testing_1.expect)(byT('listed')).toEqual(['agent-aaaa', 'agent-hidn', 'agent-newb']);
        (0, testing_1.expect)(byT('unlisted')).toEqual(['agent-gone']);
        adopt = function (id) { return evs.find(function (e) { return e.t === 'listed' && e.lane === id; }).adopt; };
        (0, testing_1.expect)(adopt('agent-aaaa')).toBeUndefined();
        (0, testing_1.expect)(adopt('agent-newb')).toEqual({ description: 'fresh', type: 'x', parent: 'main' });
        w = feed(w, evs, T0 + 50);
        (0, testing_1.expect)(w.session.digests['agent-hidn'].label).toBe('scout');
        (0, testing_1.expect)(w.session.digests['agent-hidn'].parent).toBe('agent-aaaa');
        (0, testing_1.expect)(w.session.digests['agent-newb'].status).toBe('completed');
        return [2 /*return*/];
    });
}); });
// ---- caps ---------------------------------------------------------------------
(0, testing_1.test)('a busy lane folds spans into rollups and keeps exact counts', function () { return __awaiter(void 0, void 0, void 0, function () {
    var events, i, l, rolled, starts;
    return __generator(this, function (_a) {
        events = [spawned('agent-0001', T0, meta('busy'))];
        for (i = 0; i < 5000; i++) {
            events.push(toolStart('agent-0001', "t".concat(i), T0 + 10 + i * 2), toolEnd('agent-0001', "t".concat(i), T0 + 11 + i * 2, T0 + 10 + i * 2, { isError: i % 100 === 0 }));
        }
        l = lane(events);
        (0, testing_1.expect)(l.spans.length).toBeLessThanOrEqual(model_1.CAPS.spans);
        (0, testing_1.expect)(l.rollups.length).toBeLessThanOrEqual(model_1.CAPS.rollups);
        (0, testing_1.expect)(l.counts.read).toBe(5000);
        (0, testing_1.expect)([l.tools, l.errors]).toEqual([5000, 50]);
        rolled = l.rollups.reduce(function (n, r) { var _a; return n + ((_a = r.counts.read) !== null && _a !== void 0 ? _a : 0); }, 0);
        (0, testing_1.expect)(rolled + l.spans.length).toBe(5000);
        (0, testing_1.expect)(l.rollups.reduce(function (n, r) { return n + r.errors; }, 0) + l.spans.filter(function (s) { return s.isError; }).length).toBe(50);
        starts = l.spans.map(function (s) { return s.start; });
        (0, testing_1.expect)(starts).toEqual(__spreadArray([], starts, true).sort(function (a, b) { return a - b; }));
        return [2 /*return*/];
    });
}); });
(0, testing_1.test)('past 150 lanes the oldest finished are archived and totals stay true', function () { return __awaiter(void 0, void 0, void 0, function () {
    var batch, truth, i, key, w;
    return __generator(this, function (_a) {
        batch = [];
        truth = 0;
        for (i = 0; i < 300; i++) {
            key = "agent-".concat(String(i).padStart(4, '0'));
            truth += 10 + i;
            batch.push(spawned(key, T0 + i, meta("job ".concat(i))), complete(key, "T".concat(i), T0 + 1000 + i, use(10 + i)));
        }
        w = feed(world(), batch);
        (0, testing_1.expect)(Object.keys(w.session.digests).length).toBeLessThanOrEqual(model_1.CAPS.lanes);
        (0, testing_1.expect)(w.session.archived.lanes).toBe(150);
        (0, testing_1.expect)(w.evict.length).toBe(150);
        (0, testing_1.expect)(w.session.totals.tokens).toBe(truth);
        (0, testing_1.expect)(w.session.totals.tools).toBe(0);
        // The oldest finished went first.
        (0, testing_1.expect)(w.session.digests['agent-0000']).toBeUndefined();
        (0, testing_1.expect)(w.session.digests['agent-0299']).toBeDefined();
        (0, testing_1.expect)(w.session.order.length).toBe(150);
        return [2 /*return*/];
    });
}); });
