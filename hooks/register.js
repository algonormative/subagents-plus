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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __await = (this && this.__await) || function (v) { return this instanceof __await ? (this.v = v, this) : new __await(v); }
var __asyncDelegator = (this && this.__asyncDelegator) || function (o) {
    var i, p;
    return i = {}, verb("next"), verb("throw", function (e) { throw e; }), verb("return"), i[Symbol.iterator] = function () { return this; }, i;
    function verb(n, f) { i[n] = o[n] ? function (v) { return (p = !p) ? { value: __await(o[n](v)), done: false } : f ? f(v) : v; } : f; }
};
var __asyncGenerator = (this && this.__asyncGenerator) || function (thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = Object.create((typeof AsyncIterator === "function" ? AsyncIterator : Object).prototype), verb("next"), verb("throw"), verb("return", awaitReturn), i[Symbol.asyncIterator] = function () { return this; }, i;
    function awaitReturn(f) { return function (v) { return Promise.resolve(v).then(f, reject); }; }
    function verb(n, f) { if (g[n]) { i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; if (f) i[n] = f(i[n]); } }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
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
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = void 0;
var claude_code_1 = require("claude-code");
var events_1 = require("./events");
var format_1 = require("./format");
var kinds_1 = require("./kinds");
var layout_1 = require("./layout");
var model_1 = require("./model");
var raster_1 = require("./raster");
var svg_mini_1 = require("./svg-mini");
var svg_timeline_1 = require("./svg-timeline");
var views_1 = require("./views");
// subagents-plus: hooks capture what subagents and the main loop do into a buffer; a
// 400 ms loop folds it into $.state (model.ts); the pane, the band and the
// Agent-row cards draw from that state. Nothing here calls a model.
var PANE = 'subagents';
var STATUS_TOOL = 'mcp__subagents-plus__status';
var LOOP_MS = 400;
var TICK_MS = 1000;
var RECONCILE_MS = 2000;
var COST_MS = 10000;
var IDLE_STOP_MS = 10000;
var BAND_GRACE_MS = 10000;
var TEN_MIN = 600000;
var DEFAULT_UI = { tab: 'tree', window: 'all', userClosed: false };
var sessionRef = (0, claude_code_1.atom)({ plugin: 'subagents-plus', key: 'session' }, null);
var uiRef = (0, claude_code_1.atom)({ plugin: 'subagents-plus', key: 'ui' }, DEFAULT_UI);
var tickRef = (0, claude_code_1.atom)({ plugin: 'subagents-plus', key: 'tick' }, 0);
var lanesRef = { plugin: 'subagents-plus', key: 'lanes' };
var toolUseRef = { plugin: 'subagents-plus', key: 'byToolUse' };
// Module variables hold only what may die with a reload: the unflushed buffer
// (reconcile repairs it), timers, memos and diagnostics.
var epoch = -1;
var buffer = [];
var loop;
var flushing = false;
var ticking = false;
var lastTick = 0;
var lastReconcile = 0;
var lastCost = 0;
var lastFullscreen;
var axisEnds = new Map();
/** The newest streamed text per lane, folded into the next flush as one `say` event each. */
var saying = new Map();
var memo = new Map();
var builds = new Map();
var REBUILD_MS = 8000;
var diag = {
    loadedAt: 0,
    flushes: 0,
    events: 0,
    dropped: 0,
    renders: {},
    autoOpen: undefined,
    steps: { main: 0, sub: 0 },
    errors: [],
};
function note(where, err) {
    var text = String(err instanceof Error ? err.message : err).replace(/\b(toolu|agent|wf)[_-][\w-]+/g, '<id>');
    diag.errors.push("".concat(where, ": ").concat(text.slice(0, 160)));
    if (diag.errors.length > 20)
        diag.errors.shift();
}
function push(ev) {
    buffer.push(ev);
    diag.events += 1;
    // A runaway burst between flushes keeps its newest.
    if (buffer.length > 5000)
        buffer.splice(0, buffer.length - 5000);
}
// ---- the loop ------------------------------------------------------------------
function ensureLoop($, o) {
    if (loop)
        return;
    loop = $.clock.every(LOOP_MS, function () {
        if (ticking)
            return;
        ticking = true;
        void loopTick($, o).catch(function (err) { return note('loop', err); }).finally(function () { ticking = false; });
    });
}
function loopTick($, o) {
    return __awaiter(this, void 0, void 0, function () {
        var now, session, busy, usage, usd_1, err_1;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, $.clock.now()];
                case 1:
                    now = _c.sent();
                    return [4 /*yield*/, flush($, o, now)];
                case 2:
                    _c.sent();
                    return [4 /*yield*/, (0, claude_code_1.read)($, sessionRef)];
                case 3:
                    session = _c.sent();
                    if (!session)
                        return [2 /*return*/];
                    busy = session.live > 0 || (((_a = session.digests[events_1.MAIN]) === null || _a === void 0 ? void 0 : _a.status) === 'running' && session.firstSpawnAt !== undefined);
                    if (!(session.live > 0 && now - lastTick >= TICK_MS)) return [3 /*break*/, 5];
                    lastTick = now;
                    return [4 /*yield*/, (0, claude_code_1.update)($, tickRef, function () { return now; })];
                case 4:
                    _c.sent();
                    _c.label = 5;
                case 5:
                    if (!((busy || now - session.lastEventAt < IDLE_STOP_MS) && now - lastReconcile >= RECONCILE_MS)) return [3 /*break*/, 7];
                    lastReconcile = now;
                    return [4 /*yield*/, reconcile($, session, now)];
                case 6:
                    _c.sent();
                    _c.label = 7;
                case 7:
                    if (!(session.live > 0 && now - lastCost >= COST_MS)) return [3 /*break*/, 13];
                    lastCost = now;
                    _c.label = 8;
                case 8:
                    _c.trys.push([8, 12, , 13]);
                    return [4 /*yield*/, $.session.usage()];
                case 9:
                    usage = _c.sent();
                    usd_1 = (_b = usage.cost) === null || _b === void 0 ? void 0 : _b.usd;
                    if (!(typeof usd_1 === 'number')) return [3 /*break*/, 11];
                    return [4 /*yield*/, (0, claude_code_1.update)($, sessionRef, function (s) { return (s ? __assign(__assign({}, s), { costUsd: usd_1 }) : s); })];
                case 10:
                    _c.sent();
                    _c.label = 11;
                case 11: return [3 /*break*/, 13];
                case 12:
                    err_1 = _c.sent();
                    note('usage', err_1);
                    return [3 /*break*/, 13];
                case 13:
                    if (!(!busy && buffer.length === 0 && now - session.lastEventAt > IDLE_STOP_MS)) return [3 /*break*/, 15];
                    loop === null || loop === void 0 ? void 0 : loop.cancel();
                    loop = undefined;
                    // One last tick so elapsed times settle on their final values.
                    return [4 /*yield*/, (0, claude_code_1.update)($, tickRef, function () { return now; })];
                case 14:
                    // One last tick so elapsed times settle on their final values.
                    _c.sent();
                    _c.label = 15;
                case 15: return [2 /*return*/];
            }
        });
    });
}
function reconcile($, session, now) {
    return __awaiter(this, void 0, void 0, function () {
        var list, _i, _a, ev, err_2;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, $.agent.list()];
                case 1:
                    list = _b.sent();
                    for (_i = 0, _a = (0, model_1.reconcileEvents)(session, list, now); _i < _a.length; _i++) {
                        ev = _a[_i];
                        push(ev);
                    }
                    return [3 /*break*/, 3];
                case 2:
                    err_2 = _b.sent();
                    note('reconcile', err_2);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function flush($, o, now) {
    return __awaiter(this, void 0, void 0, function () {
        var _i, saying_1, _a, lane, s, session_1, batch, plan, changed, _loop_1, _b, _c, _d, key, evs, state_1, _loop_2, _e, _f, _g, id, keys, reduced, starts, next_1, _h, _j, key;
        var _k, _l, _m, _o, _p;
        return __generator(this, function (_q) {
            switch (_q.label) {
                case 0:
                    if (flushing || (buffer.length === 0 && saying.size === 0))
                        return [2 /*return*/];
                    flushing = true;
                    _q.label = 1;
                case 1:
                    _q.trys.push([1, , 18, 19]);
                    for (_i = 0, saying_1 = saying; _i < saying_1.length; _i++) {
                        _a = saying_1[_i], lane = _a[0], s = _a[1];
                        push({ t: 'say', epoch: epoch, at: s.at, lane: lane, kind: s.kind, text: s.text });
                    }
                    saying.clear();
                    return [4 /*yield*/, (0, claude_code_1.read)($, sessionRef)];
                case 2:
                    session_1 = _q.sent();
                    if (!session_1) {
                        session_1 = (0, model_1.emptySession)(epoch < 0 ? 0 : epoch, now);
                        epoch = session_1.epoch;
                    }
                    batch = buffer.splice(0).map(function (ev) { return (ev.epoch < 0 ? __assign(__assign({}, ev), { epoch: session_1.epoch }) : ev); });
                    plan = (0, model_1.planBatch)(session_1, batch);
                    diag.dropped += plan.dropped;
                    changed = [];
                    _loop_1 = function (key, evs) {
                        var color, prev, next_2;
                        return __generator(this, function (_r) {
                            switch (_r.label) {
                                case 0:
                                    color = (_m = (_k = plan.newLanes.get(key)) !== null && _k !== void 0 ? _k : (_l = session_1.digests[key]) === null || _l === void 0 ? void 0 : _l.color) !== null && _m !== void 0 ? _m : 0;
                                    return [4 /*yield*/, (0, claude_code_1.read)($, __assign(__assign({}, lanesRef), { id: key }))];
                                case 1:
                                    prev = (_o = (_r.sent())) !== null && _o !== void 0 ? _o : null;
                                    next_2 = (0, model_1.reduceLane)(prev, evs, { key: key, epoch: session_1.epoch, color: color, now: now });
                                    if (epoch >= 0 && epoch !== session_1.epoch)
                                        return [2 /*return*/, { value: void 0 }];
                                    return [4 /*yield*/, (0, claude_code_1.update)($, __assign(__assign({}, lanesRef), { id: key }), function () { return next_2; })];
                                case 2:
                                    _r.sent();
                                    changed.push(next_2);
                                    return [2 /*return*/];
                            }
                        });
                    };
                    _b = 0, _c = plan.byLane;
                    _q.label = 3;
                case 3:
                    if (!(_b < _c.length)) return [3 /*break*/, 6];
                    _d = _c[_b], key = _d[0], evs = _d[1];
                    return [5 /*yield**/, _loop_1(key, evs)];
                case 4:
                    state_1 = _q.sent();
                    if (typeof state_1 === "object")
                        return [2 /*return*/, state_1.value];
                    _q.label = 5;
                case 5:
                    _b++;
                    return [3 /*break*/, 3];
                case 6:
                    _loop_2 = function (id, keys) {
                        return __generator(this, function (_s) {
                            switch (_s.label) {
                                case 0: return [4 /*yield*/, (0, claude_code_1.update)($, __assign(__assign({}, toolUseRef), { id: id }), function (prev) { return __spreadArray([], new Set(__spreadArray(__spreadArray([], (prev !== null && prev !== void 0 ? prev : []), true), keys, true)), true); })];
                                case 1:
                                    _s.sent();
                                    return [2 /*return*/];
                            }
                        });
                    };
                    _e = 0, _f = plan.toolUse;
                    _q.label = 7;
                case 7:
                    if (!(_e < _f.length)) return [3 /*break*/, 10];
                    _g = _f[_e], id = _g[0], keys = _g[1];
                    return [5 /*yield**/, _loop_2(id, keys)];
                case 8:
                    _q.sent();
                    _q.label = 9;
                case 9:
                    _e++;
                    return [3 /*break*/, 7];
                case 10:
                    reduced = (0, model_1.reduceSession)(session_1, changed, plan, now);
                    starts = batch.filter(function (ev) { return ev.t === 'tool-start' && ev.epoch === session_1.epoch; });
                    next_1 = __assign(__assign({}, reduced.session), { activity: (0, svg_mini_1.foldActivity)((_p = session_1.activity) !== null && _p !== void 0 ? _p : [], starts, now) });
                    _h = 0, _j = reduced.evict;
                    _q.label = 11;
                case 11:
                    if (!(_h < _j.length)) return [3 /*break*/, 14];
                    key = _j[_h];
                    return [4 /*yield*/, (0, claude_code_1.update)($, __assign(__assign({}, lanesRef), { id: key }), function () { return null; })
                        // A /clear that landed mid-flush wins: never write an older epoch back.
                    ];
                case 12:
                    _q.sent();
                    _q.label = 13;
                case 13:
                    _h++;
                    return [3 /*break*/, 11];
                case 14: 
                // A /clear that landed mid-flush wins: never write an older epoch back.
                return [4 /*yield*/, (0, claude_code_1.update)($, sessionRef, function (cur) { return (cur && cur.epoch !== session_1.epoch ? cur : next_1); })];
                case 15:
                    // A /clear that landed mid-flush wins: never write an older epoch back.
                    _q.sent();
                    diag.flushes += 1;
                    if (!(next_1.firstSpawnAt !== undefined)) return [3 /*break*/, 17];
                    return [4 /*yield*/, maybeAutoOpen($, o, next_1)];
                case 16:
                    _q.sent();
                    _q.label = 17;
                case 17: return [3 /*break*/, 19];
                case 18:
                    flushing = false;
                    return [7 /*endfinally*/];
                case 19: return [2 /*return*/];
            }
        });
    });
}
function maybeAutoOpen($, o, session) {
    return __awaiter(this, void 0, void 0, function () {
        var ui, _a, err_3;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!o.autoOpen)
                        return [2 /*return*/];
                    return [4 /*yield*/, (0, claude_code_1.read)($, uiRef)];
                case 1:
                    ui = _b.sent();
                    if (ui.userClosed || ui.autoOpenedEpoch === session.epoch)
                        return [2 /*return*/];
                    // Only where a pane would sit beside the transcript; unknown counts as yes
                    // (the engine itself still holds an unasked pane back below 144 columns).
                    if (lastFullscreen === false)
                        return [2 /*return*/];
                    return [4 /*yield*/, (0, claude_code_1.update)($, uiRef, function (u) { return (__assign(__assign({}, u), { autoOpenedEpoch: session.epoch })); })];
                case 2:
                    _b.sent();
                    _b.label = 3;
                case 3:
                    _b.trys.push([3, 5, , 6]);
                    _a = diag;
                    return [4 /*yield*/, $.ui.open({ id: PANE, title: 'Agents', columns: 100 })];
                case 4:
                    _a.autoOpen = _b.sent();
                    return [3 /*break*/, 6];
                case 5:
                    err_3 = _b.sent();
                    note('autoOpen', err_3);
                    return [3 /*break*/, 6];
                case 6: return [2 /*return*/];
            }
        });
    });
}
function startSession($, o) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, session, err_4, err_5, lanes, _i, _b, key, lane, redone_1, err_6;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _a = diag;
                    return [4 /*yield*/, $.clock.now()];
                case 1:
                    _a.loadedAt = _c.sent();
                    return [4 /*yield*/, (0, claude_code_1.read)($, sessionRef)];
                case 2:
                    session = _c.sent();
                    if (!session) return [3 /*break*/, 3];
                    epoch = session.epoch;
                    return [3 /*break*/, 5];
                case 3:
                    epoch = 0;
                    return [4 /*yield*/, (0, claude_code_1.update)($, sessionRef, function () { return (0, model_1.emptySession)(0, diag.loadedAt); })];
                case 4:
                    _c.sent();
                    _c.label = 5;
                case 5:
                    _c.trys.push([5, 7, , 8]);
                    return [4 /*yield*/, $.command.register({
                            name: 'subagents',
                            description: 'Agents pane: subagents and session activity, drawn',
                            argumentHint: '[open|close|clear|tree|timeline]',
                            immediate: true,
                        })];
                case 6:
                    _c.sent();
                    return [3 /*break*/, 8];
                case 7:
                    err_4 = _c.sent();
                    note('command', err_4);
                    return [3 /*break*/, 8];
                case 8:
                    if (!o.diagnostics) return [3 /*break*/, 12];
                    _c.label = 9;
                case 9:
                    _c.trys.push([9, 11, , 12]);
                    return [4 /*yield*/, $.tool.register({
                            name: 'status',
                            description: 'subagents-plus development aid: what the subagents-plus mod sees and draws (render surfaces, widths, Svg sizes and detail levels, lane and token summaries). Read-only; takes no input.',
                            inputSchema: { type: 'object', properties: {} },
                        })];
                case 10:
                    _c.sent();
                    return [3 /*break*/, 12];
                case 11:
                    err_5 = _c.sent();
                    note('tool', err_5);
                    return [3 /*break*/, 12];
                case 12:
                    if (!(session && Object.values(session.digests).some(function (d) { return d.cached === undefined; }))) return [3 /*break*/, 20];
                    _c.label = 13;
                case 13:
                    _c.trys.push([13, 19, , 20]);
                    lanes = [];
                    _i = 0, _b = Object.keys(session.digests);
                    _c.label = 14;
                case 14:
                    if (!(_i < _b.length)) return [3 /*break*/, 17];
                    key = _b[_i];
                    return [4 /*yield*/, (0, claude_code_1.read)($, __assign(__assign({}, lanesRef), { id: key }))];
                case 15:
                    lane = _c.sent();
                    if (lane)
                        lanes.push(lane);
                    _c.label = 16;
                case 16:
                    _i++;
                    return [3 /*break*/, 14];
                case 17:
                    redone_1 = (0, model_1.reduceSession)(session, lanes, (0, model_1.planBatch)(session, []), diag.loadedAt).session;
                    return [4 /*yield*/, (0, claude_code_1.update)($, sessionRef, function (cur) { return (cur && cur.epoch === redone_1.epoch ? __assign(__assign({}, redone_1), { activity: cur.activity, costUsd: cur.costUsd }) : cur); })];
                case 18:
                    _c.sent();
                    return [3 /*break*/, 20];
                case 19:
                    err_6 = _c.sent();
                    note('recount', err_6);
                    return [3 /*break*/, 20];
                case 20:
                    if (!session) return [3 /*break*/, 22];
                    return [4 /*yield*/, reconcile($, session, diag.loadedAt)];
                case 21:
                    _c.sent();
                    ensureLoop($, o);
                    _c.label = 22;
                case 22: return [2 /*return*/];
            }
        });
    });
}
function clearSession($) {
    return __awaiter(this, void 0, void 0, function () {
        var old, now, _i, _a, key;
        var _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, (0, claude_code_1.read)($, sessionRef)];
                case 1:
                    old = _d.sent();
                    buffer = [];
                    epoch = ((_b = old === null || old === void 0 ? void 0 : old.epoch) !== null && _b !== void 0 ? _b : 0) + 1;
                    return [4 /*yield*/, $.clock.now()];
                case 2:
                    now = _d.sent();
                    return [4 /*yield*/, (0, claude_code_1.update)($, sessionRef, function () { return (0, model_1.emptySession)(epoch, now); })];
                case 3:
                    _d.sent();
                    return [4 /*yield*/, (0, claude_code_1.update)($, uiRef, function (u) { return (__assign(__assign({}, u), { expanded: [], folded: [], transcriptOf: undefined, autoOpenedEpoch: undefined, fullAnswer: undefined })); })];
                case 4:
                    _d.sent();
                    axisEnds.clear();
                    memo.clear();
                    builds.clear();
                    _i = 0, _a = Object.keys((_c = old === null || old === void 0 ? void 0 : old.digests) !== null && _c !== void 0 ? _c : {});
                    _d.label = 5;
                case 5:
                    if (!(_i < _a.length)) return [3 /*break*/, 8];
                    key = _a[_i];
                    return [4 /*yield*/, (0, claude_code_1.update)($, __assign(__assign({}, lanesRef), { id: key }), function () { return null; })];
                case 6:
                    _d.sent();
                    _d.label = 7;
                case 7:
                    _i++;
                    return [3 /*break*/, 5];
                case 8: return [2 /*return*/];
            }
        });
    });
}
function statusText($) {
    return __awaiter(this, void 0, void 0, function () {
        var session, summary;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, claude_code_1.read)($, sessionRef)];
                case 1:
                    session = _a.sent();
                    summary = session
                        ? {
                            epoch: session.epoch,
                            lanes: Object.values(session.digests).map(function (d) { var _a, _b, _c; return ({ label: d.label, type: d.type, status: d.status, depth: d.depth, tools: d.tools, tokens: d.tokens, hidden: (_a = d.hidden) !== null && _a !== void 0 ? _a : false, workflow: d.run ? ((_c = (_b = session.workflows[d.run]) === null || _b === void 0 ? void 0 : _b.name) !== null && _c !== void 0 ? _c : 'unnamed') : undefined }); }),
                            totals: session.totals, live: session.live, done: session.done, failed: session.failed, archived: session.archived,
                        }
                        : null;
                    return [2 /*return*/, JSON.stringify(__assign(__assign({}, diag), { buffered: buffer.length, loop: loop !== undefined, session: summary }), null, 1)];
            }
        });
    });
}
// ---- drawing helpers ----------------------------------------------------------------
function lanesFor($, session, keys) {
    return __awaiter(this, void 0, void 0, function () {
        var out, _i, keys_1, key, lane;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    out = new Map();
                    _i = 0, keys_1 = keys;
                    _a.label = 1;
                case 1:
                    if (!(_i < keys_1.length)) return [3 /*break*/, 4];
                    key = keys_1[_i];
                    if (!session.digests[key] || session.digests[key].hidden)
                        return [3 /*break*/, 3];
                    return [4 /*yield*/, (0, claude_code_1.read)($, __assign(__assign({}, lanesRef), { id: key }))];
                case 2:
                    lane = _a.sent();
                    if (lane)
                        out.set(key, lane);
                    _a.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/, out];
            }
        });
    });
}
function actionsFor($) {
    return {
        tab: function (tab) { return void (0, claude_code_1.update)($, uiRef, function (u) { return (__assign(__assign({}, u), { tab: tab })); }); },
        expand: function (key) { return void (0, claude_code_1.update)($, uiRef, function (u) { return (__assign(__assign({}, u), { expanded: toggled(u.expanded, key), fullAnswer: undefined })); }); },
        fold: function (key) { return void (0, claude_code_1.update)($, uiRef, function (u) { return (__assign(__assign({}, u), { folded: toggled(u.folded, key) })); }); },
        transcript: function (key) { return void (0, claude_code_1.update)($, uiRef, function (u) { return (__assign(__assign({}, u), { transcriptOf: key })); }); },
        toggleWindow: function () { return void (0, claude_code_1.update)($, uiRef, function (u) { return (__assign(__assign({}, u), { window: u.window === '10m' ? 'all' : '10m' })); }); },
        toggleAnswer: function () { return void (0, claude_code_1.update)($, uiRef, function (u) { return (__assign(__assign({}, u), { fullAnswer: !u.fullAnswer })); }); },
        jump: function (key) { return void jumpTo($, key); },
        open: function (key) { return void openPane($, key); },
    };
}
function transcriptOf($, agentId) {
    return __awaiter(this, void 0, void 0, function () {
        var found, err_7;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, $.session.messages({ agentId: agentId })];
                case 1:
                    found = _a.sent();
                    if (!Array.isArray(found))
                        return [2 /*return*/, 'unreadable'];
                    return [2 /*return*/, found.slice(-60).map(function (m) { return ({
                            role: m.role,
                            text: (0, format_1.tildeHome)(m.text),
                            tools: m.toolUses.map(function (t) { return (__assign({ tool: String(t.tool), summary: (0, kinds_1.summarize)(String(t.tool), t.input) }, (t.isError ? { isError: true } : {}))); }),
                        }); })];
                case 2:
                    err_7 = _a.sent();
                    note('transcript', err_7);
                    return [2 /*return*/, 'unreadable'];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function jumpTo($, key) {
    return __awaiter(this, void 0, void 0, function () {
        var lane, id, err_8;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, (0, claude_code_1.read)($, __assign(__assign({}, lanesRef), { id: key }))];
                case 1:
                    lane = _b.sent();
                    id = (_a = lane === null || lane === void 0 ? void 0 : lane.meta) === null || _a === void 0 ? void 0 : _a.toolUseId;
                    if (!id)
                        return [2 /*return*/];
                    _b.label = 2;
                case 2:
                    _b.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, $.ui.scroll({ to: { requestId: id } })];
                case 3:
                    _b.sent();
                    return [3 /*break*/, 5];
                case 4:
                    err_8 = _b.sent();
                    note('jump', err_8);
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    });
}
function openPane($, key) {
    return __awaiter(this, void 0, void 0, function () {
        var session, _a, ancestors, k, hops, err_9;
        var _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    if (!key) return [3 /*break*/, 2];
                    return [4 /*yield*/, (0, claude_code_1.read)($, sessionRef)];
                case 1:
                    _a = _d.sent();
                    return [3 /*break*/, 3];
                case 2:
                    _a = null;
                    _d.label = 3;
                case 3:
                    session = _a;
                    ancestors = new Set();
                    for (k = key ? (_b = session === null || session === void 0 ? void 0 : session.digests[key]) === null || _b === void 0 ? void 0 : _b.parent : undefined, hops = 0; k && hops < 64; k = (_c = session === null || session === void 0 ? void 0 : session.digests[k]) === null || _c === void 0 ? void 0 : _c.parent, hops++)
                        ancestors.add(k);
                    return [4 /*yield*/, (0, claude_code_1.update)($, uiRef, function (u) {
                            var _a, _b, _c;
                            return (__assign(__assign(__assign({}, u), { userClosed: false, tab: key ? 'tree' : u.tab }), (key ? {
                                expanded: ((_a = u.expanded) !== null && _a !== void 0 ? _a : []).includes(key) ? u.expanded : __spreadArray(__spreadArray([], ((_b = u.expanded) !== null && _b !== void 0 ? _b : []), true), [key], false),
                                folded: ((_c = u.folded) !== null && _c !== void 0 ? _c : []).filter(function (f) { return !ancestors.has(f); }),
                            } : {})));
                        })];
                case 4:
                    _d.sent();
                    _d.label = 5;
                case 5:
                    _d.trys.push([5, 7, , 8]);
                    return [4 /*yield*/, $.ui.open({ id: PANE, title: 'Agents', columns: 100 })];
                case 6:
                    _d.sent();
                    return [3 /*break*/, 8];
                case 7:
                    err_9 = _d.sent();
                    note('open', err_9);
                    return [3 /*break*/, 8];
                case 8: return [2 /*return*/];
            }
        });
    });
}
function toggled(list, key) {
    var now = list !== null && list !== void 0 ? list : [];
    return now.includes(key) ? now.filter(function (k) { return k !== key; }) : __spreadArray(__spreadArray([], now, true), [key], false).slice(-20);
}
function memoized(key, make) {
    var hit = memo.get(key);
    if (hit)
        return hit;
    var p = make();
    memo.set(key, p);
    if (memo.size > 64)
        memo.delete(memo.keys().next().value);
    return p;
}
// ---- register --------------------------------------------------------------------
var register = function (on, options) {
    var o = {
        autoOpen: options.autoOpen !== false,
        inlineCards: options.inlineCards === 'all' || options.inlineCards === 'off' ? options.inlineCards : 'desktop',
        band: options.band !== false,
        streamTap: options.streamTap === 'all' || options.streamTap === 'off' ? options.streamTap : 'subagents',
        animate: options.animate !== false,
        diagnostics: options.diagnostics === true,
    };
    on('session.start', { isInteractive: [true, false] }, function ($, e, next) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, startSession($, o)];
                case 1:
                    _a.sent();
                    return [2 /*return*/, next(e)];
            }
        });
    }); }).catch(function ($, e, next) { return next(e); });
    on('session.end', { reason: 'clear' }, function ($, e, next) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, clearSession($)];
                case 1:
                    _a.sent();
                    return [2 /*return*/, next(e)];
            }
        });
    }); }).catch(function ($, e, next) { return next(e); });
    on('command.run', { command: 'subagents' }, function ($, e) { return __awaiter(void 0, void 0, void 0, function () {
        var verb, opened;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    verb = e.args.trim().toLowerCase();
                    if (!(verb === 'close')) return [3 /*break*/, 2];
                    return [4 /*yield*/, $.ui.close({ id: PANE })];
                case 1:
                    _b.sent();
                    return [2 /*return*/, { text: 'Agents pane closed.' }];
                case 2:
                    if (!(verb === 'clear')) return [3 /*break*/, 4];
                    return [4 /*yield*/, clearSession($)];
                case 3:
                    _b.sent();
                    return [2 /*return*/, { text: 'Cleared the Agents pane; agents still running reappear as they act.' }];
                case 4:
                    if (!(verb === 'tree' || verb === 'timeline')) return [3 /*break*/, 6];
                    return [4 /*yield*/, (0, claude_code_1.update)($, uiRef, function (u) { return (__assign(__assign({}, u), { tab: verb })); })];
                case 5:
                    _b.sent();
                    _b.label = 6;
                case 6: return [4 /*yield*/, (0, claude_code_1.update)($, uiRef, function (u) { return (__assign(__assign({}, u), { userClosed: false })); })];
                case 7:
                    _b.sent();
                    return [4 /*yield*/, $.ui.open({ id: PANE, title: 'Agents', columns: 100 })];
                case 8:
                    opened = _b.sent();
                    ensureLoop($, o);
                    return [2 /*return*/, { text: opened.isPlaced ? 'Agents pane opened.' : "The Agents pane waits for room (".concat((_a = opened.reason) !== null && _a !== void 0 ? _a : 'not placed', ").") }];
            }
        });
    }); }).catch(function () { return ({ text: 'subagents-plus: that failed, try again.' }); });
    if (o.diagnostics) {
        // Cast: the laid tool table predates this mod's own tool.
        on('tool.call', { tool: STATUS_TOOL }, function ($) { return __awaiter(void 0, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = {};
                        return [4 /*yield*/, statusText($)];
                    case 1: return [2 /*return*/, (_a.result = _b.sent(), _a)];
                }
            });
        }); })
            .catch(function () { return ({ deny: 'subagents-plus status failed' }); });
    }
    on('ui.close', { id: PANE }, function ($, e, next) { return __awaiter(void 0, void 0, void 0, function () {
        var out;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, next(e)];
                case 1:
                    out = _a.sent();
                    if (!(e.origin.kind === 'person')) return [3 /*break*/, 3];
                    return [4 /*yield*/, (0, claude_code_1.update)($, uiRef, function (u) { return (__assign(__assign({}, u), { userClosed: true })); })];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3: return [2 /*return*/, out];
            }
        });
    }); }).catch(function ($, e, next) { return next(e); });
    // ---- capture ------------------------------------------------------------------
    on('agent.spawn', function ($, e, next) { return __awaiter(void 0, void 0, void 0, function () {
        var at, r;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, $.clock.now()];
                case 1:
                    at = _b.sent();
                    return [4 /*yield*/, next(e)];
                case 2:
                    r = _b.sent();
                    if (r.agentId) {
                        push({
                            t: 'spawned',
                            epoch: epoch,
                            at: at,
                            lane: r.agentId,
                            meta: __assign(__assign(__assign(__assign(__assign(__assign(__assign({ description: e.description, type: e.subagentType }, (e.name ? { name: e.name } : {})), { model: r.model }), (e.isTeammate ? { isTeammate: true } : {})), (e.fork ? { isFork: true } : {})), { background: e.background, parent: (_a = e.parentAgentId) !== null && _a !== void 0 ? _a : events_1.MAIN }), (e.workflow ? { run: e.workflow.runId, runIndex: e.workflow.agentIndex } : {})), (e.tool_use_id && !e.workflow ? { toolUseId: e.tool_use_id } : {})),
                        });
                        ensureLoop($, o);
                    }
                    return [2 /*return*/, r];
            }
        });
    }); }).catch(function ($, e, next) { return next(e); });
    on('tool.call', function ($, e, next) { return __awaiter(void 0, void 0, void 0, function () {
        var lane, tool, kind, summary, startedAt, r, at, result, ev, child, status_1;
        var _a, _b, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    if (String(e.tool) === STATUS_TOOL)
                        return [2 /*return*/, next(e)];
                    lane = (_a = e.agentId) !== null && _a !== void 0 ? _a : events_1.MAIN;
                    tool = String(e.tool);
                    kind = (0, kinds_1.classify)(tool, e);
                    summary = (0, kinds_1.summarize)(tool, e);
                    return [4 /*yield*/, $.clock.now()];
                case 1:
                    startedAt = _e.sent();
                    push({ t: 'tool-start', epoch: epoch, at: startedAt, lane: lane, id: e.tool_use_id, tool: tool, kind: kind, summary: summary });
                    ensureLoop($, o);
                    return [4 /*yield*/, next(e)];
                case 2:
                    r = _e.sent();
                    return [4 /*yield*/, $.clock.now()];
                case 3:
                    at = _e.sent();
                    result = r.result;
                    ev = {
                        t: 'tool-end',
                        epoch: epoch,
                        at: at,
                        lane: lane,
                        id: e.tool_use_id,
                        tool: tool,
                        kind: kind,
                        summary: summary,
                        startedAt: startedAt,
                        isError: r.isError === true || r.deny !== undefined,
                    };
                    if (result && typeof result === 'object') {
                        if (tool === 'Agent' || tool === 'Task') {
                            child = typeof result.agentId === 'string' ? result.agentId : typeof result.agent_id === 'string' ? result.agent_id : undefined;
                            if (child)
                                ev.child = child;
                            status_1 = String((_b = result.status) !== null && _b !== void 0 ? _b : '');
                            ev.launch = status_1 === 'async_launched' ? 'async' : status_1 === 'remote_launched' ? 'remote' : status_1 === 'teammate_spawned' ? 'teammate' : status_1 === 'completed' ? 'completed' : undefined;
                            if (typeof result.totalTokens === 'number') {
                                ev.childTotals = { tokens: result.totalTokens, tools: Number((_c = result.totalToolUseCount) !== null && _c !== void 0 ? _c : 0), durationMs: Number((_d = result.totalDurationMs) !== null && _d !== void 0 ? _d : 0) };
                            }
                        }
                        else if (tool === 'Workflow' && typeof result.runId === 'string') {
                            ev.workflow = __assign({ runId: result.runId }, (typeof result.workflowName === 'string' ? { name: (0, format_1.clip)(result.workflowName, 40) } : {}));
                        }
                    }
                    push(ev);
                    return [2 /*return*/, r];
            }
        });
    }); }).catch(function ($, e, next) { return next(e); });
    on('turn.start', function ($, e, next) { return __awaiter(void 0, void 0, void 0, function () {
        var _a;
        var _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _a = push;
                    _b = { t: 'turn-start', epoch: epoch };
                    return [4 /*yield*/, $.clock.now()];
                case 1:
                    _a.apply(void 0, [(_b.at = _c.sent(), _b.lane = events_1.MAIN, _b.turnId = e.turnId, _b)]);
                    ensureLoop($, o);
                    return [2 /*return*/, next(e)];
            }
        });
    }); }).catch(function ($, e, next) { return next(e); });
    on('turn.complete', function ($, e, next) { return __awaiter(void 0, void 0, void 0, function () {
        var _a;
        var _b;
        var _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    _a = push;
                    _b = {
                        t: 'turn-complete',
                        epoch: epoch
                    };
                    return [4 /*yield*/, $.clock.now()];
                case 1:
                    _a.apply(void 0, [(_b.at = _e.sent(),
                            _b.lane = (_c = e.agentId) !== null && _c !== void 0 ? _c : events_1.MAIN,
                            _b.turnId = e.turnId,
                            _b.reason = e.reason,
                            _b.durationMs = e.durationMs,
                            _b.usage = (0, events_1.usageOf)(e.usage),
                            _b.answer = (0, format_1.clip)((_d = e.answer) !== null && _d !== void 0 ? _d : '', 4000),
                            _b)]);
                    ensureLoop($, o);
                    return [2 /*return*/, next(e)];
            }
        });
    }); }).catch(function ($, e, next) { return next(e); });
    if (o.streamTap !== 'off') {
        on('turn.step', function ($, e, next) {
            return __asyncGenerator(this, arguments, function () {
                var lane, _a, stream, r, step, c, prev, text, _b;
                var _c, _d;
                var _e;
                return __generator(this, function (_f) {
                    switch (_f.label) {
                        case 0:
                            if (e.agentId === undefined)
                                diag.steps.main += 1;
                            else
                                diag.steps.sub += 1;
                            if (!(o.streamTap === 'subagents' && e.agentId === undefined)) return [3 /*break*/, 4];
                            return [5 /*yield**/, __values(__asyncDelegator(__asyncValues(next(e))))];
                        case 1: return [4 /*yield*/, __await.apply(void 0, [_f.sent()])];
                        case 2: return [4 /*yield*/, __await.apply(void 0, [_f.sent()])];
                        case 3: return [2 /*return*/, _f.sent()];
                        case 4:
                            lane = (_e = e.agentId) !== null && _e !== void 0 ? _e : events_1.MAIN;
                            _a = push;
                            _c = { t: 'step-start', epoch: epoch };
                            return [4 /*yield*/, __await($.clock.now())];
                        case 5:
                            _a.apply(void 0, [(_c.at = _f.sent(), _c.lane = lane, _c.turnId = e.turnId, _c.index = e.index, _c.model = e.model, _c)]);
                            ensureLoop($, o);
                            stream = next(e);
                            _f.label = 6;
                        case 6: return [4 /*yield*/, __await(stream.next())];
                        case 7:
                            step = _f.sent();
                            if (step.done) {
                                r = step.value;
                                return [3 /*break*/, 11];
                            }
                            c = step.value;
                            if (c.kind === 'text' || c.kind === 'thinking') {
                                prev = saying.get(lane);
                                text = (prev && prev.kind === c.kind ? prev.text : '') + c.text;
                                saying.set(lane, { kind: c.kind, text: (0, format_1.tildeHome)(text.slice(-240)), at: Date.now() });
                            }
                            else if (c.kind === 'tool') {
                                saying.set(lane, { kind: 'tool', text: c.name, at: Date.now() });
                            }
                            return [4 /*yield*/, __await(c)];
                        case 8: return [4 /*yield*/, _f.sent()];
                        case 9:
                            _f.sent();
                            _f.label = 10;
                        case 10: return [3 /*break*/, 6];
                        case 11:
                            _b = push;
                            _d = { t: 'step-end', epoch: epoch };
                            return [4 /*yield*/, __await($.clock.now())];
                        case 12:
                            _b.apply(void 0, [(_d.at = _f.sent(), _d.lane = lane, _d.turnId = e.turnId, _d.index = e.index, _d.usage = r.usage ? (0, events_1.usageOf)(r.usage) : undefined, _d)]);
                            return [4 /*yield*/, __await(r)];
                        case 13: return [2 /*return*/, _f.sent()];
                    }
                });
            });
        });
    }
    // ---- drawing ------------------------------------------------------------------------
    on('ui.render', { component: 'Pane', requestId: PANE }, function ($, e) { return __awaiter(void 0, void 0, void 0, function () {
        var els, kit, session, ui, tick, now, viewKey, columns, lanes, t0Session, t0, cast, shape, prevBuild, fresh, dataKey, picture, axisKey, t1_1, sparkline, showing, transcript, _a;
        var _b, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    els = $.ui.resolve(e);
                    kit = __assign(__assign({ surface: e.surface, Box: els.Box, Text: els.Text, Button: els.Button, Markdown: els.Markdown }, (e.surface !== 'terminal' && 'Svg' in els ? { Svg: els.Svg } : {})), (e.surface === 'terminal' && 'Raster' in els ? { Raster: els.Raster } : {}));
                    if (((_b = e.viewport) === null || _b === void 0 ? void 0 : _b.isFullscreen) !== undefined)
                        lastFullscreen = e.viewport.isFullscreen;
                    return [4 /*yield*/, (0, claude_code_1.read)($, sessionRef)];
                case 1:
                    session = _e.sent();
                    return [4 /*yield*/, (0, claude_code_1.read)($, uiRef)];
                case 2:
                    ui = _e.sent();
                    if (!session)
                        return [2 /*return*/, <kit.Text dimColor>Waiting for the session to start…</kit.Text>
                            // The pane holds no interactive frame any more, so a 1 Hz redraw (glyphs
                            // turning, names breathing, elapsed times) costs no flash or lost click.
                        ];
                    return [4 /*yield*/, (0, claude_code_1.read)($, tickRef)];
                case 3:
                    tick = _e.sent();
                    now = Math.max(Date.now(), tick, session.lastEventAt);
                    viewKey = e.props.view.agentId;
                    columns = Math.max(20, e.props.bodyColumns);
                    return [4 /*yield*/, lanesFor($, session, session.order)];
                case 4:
                    lanes = _e.sent();
                    t0Session = Math.min.apply(Math, __spreadArray([session.startedAt], __spreadArray([], lanes.values(), true).map(function (l) { return l.firstAt; }), false));
                    t0 = ui.window === '10m' ? Math.max(t0Session, now - TEN_MIN) : t0Session;
                    cast = session.order.map(function (k) { var _a, _b; return "".concat(k, ":").concat((_a = session.digests[k]) === null || _a === void 0 ? void 0 : _a.status).concat(((_b = session.digests[k]) === null || _b === void 0 ? void 0 : _b.quiet) ? 'q' : ''); }).join(',');
                    shape = "".concat(session.epoch, "|").concat(cast, "|").concat(viewKey !== null && viewKey !== void 0 ? viewKey : '', "|").concat(columns, "|").concat(o.animate, "|").concat(ui.tab, "|").concat(ui.window);
                    prevBuild = builds.get('pane');
                    fresh = !prevBuild || prevBuild.shape !== shape || (session.lastEventAt > prevBuild.at && now - prevBuild.built >= REBUILD_MS);
                    if (fresh)
                        builds.set('pane', { shape: shape, at: session.lastEventAt, built: now });
                    dataKey = "".concat(shape, "|").concat(builds.get('pane').built);
                    if (ui.tab === 'timeline') {
                        axisKey = "".concat(ui.window, "|").concat(session.epoch);
                        t1_1 = (0, layout_1.axisEnd)(t0, now, axisEnds.get(axisKey));
                        axisEnds.set(axisKey, t1_1);
                        picture = memoized("t|".concat(dataKey, "|").concat(ui.window, "|").concat(t1_1), function () {
                            var rows = (0, views_1.timelineRows)(session, lanes, ui, viewKey, t0);
                            if (!kit.Svg) {
                                var laneRows = rows.filter(function (r) { return r.t === 'lane'; });
                                var cols = Math.max(10, Math.min(512, columns - 24));
                                var packed = (0, raster_1.timelineCells)(laneRows.map(function (r) { return ({ color: r.color, status: r.status, live: (0, model_1.isLive)(r.status) && !r.quiet, start: r.start, end: r.end, spans: r.spans, steps: r.steps }); }), { columns: cols, t0: t0, t1: t1_1, now: now });
                                return __assign(__assign({ kind: 'raster', key: 'timeline' }, packed), { labels: laneRows.map(function (r) { return ({ text: "".concat('  '.repeat(r.depth)).concat(r.label), color: r.color < 0 ? 'claude' : undefined, dim: !(0, model_1.isLive)(r.status) }); }) });
                            }
                            var width = (0, layout_1.pxWidth)(columns, 2);
                            var b = (0, svg_timeline_1.buildTimelineSvg)(rows, { width: width, now: now, t0: t0, t1: t1_1, animate: false }, layout_1.SVG_ELEMENT_MAX);
                            diag.renders.timeline = { chars: b.source.length, level: b.level, rows: rows.length };
                            // A still image: an interactive frame swallows the pane's scroll and clicks.
                            return { kind: 'svg', source: b.source, alt: b.alt, width: width, height: b.height, interactive: false };
                        });
                    }
                    sparkline = session.activity && session.activity.length
                        ? kit.Svg
                            ? { kind: 'svg', source: (0, svg_mini_1.sparklineSvg)(session.activity, Math.floor(now / 5000) * 5000, 160, 16), alt: 'Tool calls over the last two minutes', width: 160, height: 16, interactive: false }
                            : __assign({ kind: 'raster', key: 'spark' }, (0, raster_1.sparkCells)(session.activity, now, 24))
                        : undefined;
                    diag.renders.Pane = { surface: e.surface, columns: e.props.bodyColumns, placement: e.props.placement, isFullscreen: (_c = e.viewport) === null || _c === void 0 ? void 0 : _c.isFullscreen, tab: ui.tab };
                    showing = ui.transcriptOf && ((_d = ui.expanded) !== null && _d !== void 0 ? _d : []).includes(ui.transcriptOf) ? ui.transcriptOf : undefined;
                    if (!showing) return [3 /*break*/, 6];
                    return [4 /*yield*/, transcriptOf($, showing)];
                case 5:
                    _a = _e.sent();
                    return [3 /*break*/, 7];
                case 6:
                    _a = undefined;
                    _e.label = 7;
                case 7:
                    transcript = _a;
                    return [2 /*return*/, (0, views_1.paneTree)(kit, { session: session, ui: ui, lanes: lanes, now: now, columns: columns, viewKey: viewKey, picture: picture, sparkline: sparkline, transcript: transcript }, actionsFor($))];
            }
        });
    }); });
    if (o.band) {
        on('ui.render', { component: 'AbovePrompt' }, function ($, e, next) { return __awaiter(void 0, void 0, void 0, function () {
            var session, tick, now, grace, lastEnd, els, kit, spark, mine, beneath;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (((_a = e.viewport) === null || _a === void 0 ? void 0 : _a.isFullscreen) !== undefined)
                            lastFullscreen = e.viewport.isFullscreen;
                        if (e.props.hasSurvey)
                            return [2 /*return*/, next(e)];
                        return [4 /*yield*/, (0, claude_code_1.read)($, sessionRef)];
                    case 1:
                        session = _c.sent();
                        return [4 /*yield*/, (0, claude_code_1.read)($, tickRef)];
                    case 2:
                        tick = _c.sent();
                        if (!session || session.firstSpawnAt === undefined)
                            return [2 /*return*/, next(e)];
                        now = Math.max(tick, session.lastEventAt);
                        grace = session.live === 0;
                        lastEnd = Math.max.apply(Math, __spreadArray([0], Object.values(session.digests).map(function (d) { var _a; return (_a = d.endedAt) !== null && _a !== void 0 ? _a : 0; }), false));
                        if (grace && now - lastEnd > BAND_GRACE_MS)
                            return [2 /*return*/, next(e)];
                        els = $.ui.resolve(e);
                        kit = __assign(__assign({ surface: e.surface, Box: els.Box, Text: els.Text, Button: els.Button, Markdown: els.Markdown }, (e.surface !== 'terminal' && 'Svg' in els ? { Svg: els.Svg } : {})), (e.surface === 'terminal' && 'Raster' in els ? { Raster: els.Raster } : {}));
                        spark = !grace && ((_b = session.activity) === null || _b === void 0 ? void 0 : _b.length)
                            ? kit.Svg
                                ? { kind: 'svg', source: (0, svg_mini_1.sparklineSvg)(session.activity, Math.floor(now / 5000) * 5000, 120, 14), alt: 'Tool calls over the last two minutes', width: 120, height: 14, interactive: false }
                                : __assign({ kind: 'raster', key: 'band-spark' }, (0, raster_1.sparkCells)(session.activity, now, 16))
                            : undefined;
                        diag.renders.AbovePrompt = { surface: e.surface, columns: e.props.bodyColumns, live: session.live };
                        mine = (0, views_1.bandTree)(kit, session, now, e.props.view.agentId, grace, spark, actionsFor($));
                        return [4 /*yield*/, next(e)];
                    case 3:
                        beneath = _c.sent();
                        return [2 /*return*/, <kit.Box flexDirection="column">{mine}{beneath}</kit.Box>];
                }
            });
        }); });
    }
    if (o.inlineCards !== 'off') {
        on('ui.render', { component: 'ToolUse', props: { tool: 'Agent' } }, function ($, e, next) { return __awaiter(void 0, void 0, void 0, function () {
            var keys, session, key, d, lane, _a, onScreen, live, now, els, kit, width, strip, children, input, beneath;
            var _b, _c, _d, _e, _f, _g, _h;
            return __generator(this, function (_j) {
                switch (_j.label) {
                    case 0:
                        if (((_b = e.viewport) === null || _b === void 0 ? void 0 : _b.isFullscreen) !== undefined)
                            lastFullscreen = e.viewport.isFullscreen;
                        if (o.inlineCards === 'desktop' && e.surface === 'terminal')
                            return [2 /*return*/, next(e)];
                        return [4 /*yield*/, (0, claude_code_1.read)($, __assign(__assign({}, toolUseRef), { id: e.props.tool_use_id }))];
                    case 1:
                        keys = (_c = (_j.sent())) !== null && _c !== void 0 ? _c : [];
                        return [4 /*yield*/, (0, claude_code_1.read)($, sessionRef)];
                    case 2:
                        session = _j.sent();
                        key = keys[0];
                        d = key && session ? session.digests[key] : undefined;
                        if (!d && !e.props.isRunning)
                            return [2 /*return*/, next(e)];
                        if (!key) return [3 /*break*/, 4];
                        return [4 /*yield*/, (0, claude_code_1.read)($, __assign(__assign({}, lanesRef), { id: key }))];
                    case 3:
                        _a = ((_d = (_j.sent())) !== null && _d !== void 0 ? _d : undefined);
                        return [3 /*break*/, 5];
                    case 4:
                        _a = undefined;
                        _j.label = 5;
                    case 5:
                        lane = _a;
                        onScreen = e.props.onScreen !== null;
                        live = d ? (0, model_1.isLive)(d.status) && !d.quiet : true;
                        now = Math.max(Date.now(), (_e = lane === null || lane === void 0 ? void 0 : lane.lastAt) !== null && _e !== void 0 ? _e : 0);
                        els = $.ui.resolve(e);
                        kit = __assign({ surface: e.surface, Box: els.Box, Text: els.Text, Button: els.Button, Markdown: els.Markdown }, (e.surface !== 'terminal' && 'Svg' in els ? { Svg: els.Svg } : {}));
                        width = (0, layout_1.pxWidth)(Math.min((_g = (_f = e.viewport) === null || _f === void 0 ? void 0 : _f.columns) !== null && _g !== void 0 ? _g : 80, 110), 8);
                        strip = kit.Svg && lane && onScreen && lane.spans.length
                            ? { kind: 'svg', source: (0, svg_mini_1.cardStripSvg)(lane.spans, { width: width, t0: (_h = lane.spawnedAt) !== null && _h !== void 0 ? _h : lane.firstAt, now: lane.lastAt, end: lane.endedAt, color: lane.color, live: live }), alt: "".concat(lane.tools, " tool calls"), width: width, height: 14, interactive: false }
                            : undefined;
                        children = session && key ? Object.values(session.digests).filter(function (c) { return c.parent === key && !c.hidden; }).length : 0;
                        input = e.props.input;
                        diag.renders.ToolUse = { surface: e.surface, known: d !== undefined, onScreen: e.props.onScreen === undefined ? 'absent' : onScreen };
                        return [4 /*yield*/, next(e)];
                    case 6:
                        beneath = _j.sent();
                        return [2 /*return*/, (0, views_1.cardTree)(kit, d, lane, { description: typeof (input === null || input === void 0 ? void 0 : input.description) === 'string' ? input.description : undefined, subagentType: typeof (input === null || input === void 0 ? void 0 : input.subagent_type) === 'string' ? input.subagent_type : undefined }, now, strip, children, actionsFor($), beneath)];
                }
            });
        }); });
    }
};
exports.register = register;
