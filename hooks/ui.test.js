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
Object.defineProperty(exports, "__esModule", { value: true });
var testing_1 = require("claude-code/testing");
var NOW = 1800000000000;
var AGENT = 'agent-LEAKCHECK-1';
var NESTED = 'agent-LEAKCHECK-2';
var TOOL_USE = 'toolu_LEAK';
var PANE_PROPS = { title: 'Agents', isFocused: false, bodyColumns: 100, placement: 'dock', scroll: { top: 0, bodyRows: 40 }, view: {} };
var BAND_PROPS = { hasSurvey: false, isWorking: true, maxRows: 6, bodyColumns: 100, scroll: { top: 0, bodyRows: 6 }, view: {} };
var ROW_PROPS = { tool_use_id: TOOL_USE, tool: 'Agent', input: { description: 'find auth code', subagent_type: 'Explore', prompt: 'x' }, isRunning: true, isErrored: false, isInterrupted: false };
function spawnInput(over) {
    return __assign({ tool_use_id: TOOL_USE, prompt: 'Find the auth code', description: 'find auth code', subagentType: 'Explore', provider: { plugin: 'engine', tier: 'core' }, parentModel: 'claude-opus-5-5', background: true, fork: false }, over);
}
/** Raises a session of one Explore agent with one nested agent, as the engine would. */
function seed($, on) {
    return __awaiter(this, void 0, void 0, function () {
        var clock, next;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    clock = testing_1.mock.clock(on, { now: NOW });
                    next = 1;
                    on('agent.spawn', function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                        return [2 /*return*/, ({ model: 'claude-sonnet-5-5', agentId: next++ === 1 ? AGENT : NESTED })];
                    }); }); });
                    on('tool.call', function (_$, e) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                        return [2 /*return*/, ({ result: e.tool === 'Agent' ? { status: 'async_launched', agentId: AGENT } : { ok: true } })];
                    }); }); });
                    on('turn.complete', function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                        return [2 /*return*/, ({ text: '' })];
                    }); }); });
                    on('agent.list', function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                        return [2 /*return*/, ({ value: [] })];
                    }); }); });
                    on('ui.open', function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                        return [2 /*return*/, ({ value: { isPlaced: true } })];
                    }); }); });
                    on('session.usage', function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                        return [2 /*return*/, ({ value: { cost: { usd: 1.25 } } })];
                    }); }); });
                    on('session.messages', function () { return __awaiter(_this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            return [2 /*return*/, ({ value: [
                                        { role: 'user', text: 'Find the auth code', toolUses: [] },
                                        { role: 'assistant', text: 'Looking at **session.ts** now.', toolUses: [{ tool_use_id: 'toolu_x', tool: 'Read', input: { file_path: '/repo/src/auth/session.ts' } }] },
                                    ] })];
                        });
                    }); });
                    on('ui.render', function ($r, e) { return __awaiter(_this, void 0, void 0, function () { var Box; return __generator(this, function (_a) {
                        Box = $r.ui.resolve(e).Box;
                        return [2 /*return*/, <Box key="engine-own"/>];
                    }); }); });
                    return [4 /*yield*/, $.agent.spawn(spawnInput({}))];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, $.tool.call({ tool: 'Read', tool_use_id: 'toolu_r1', file_path: '/repo/src/auth/session.ts', agentId: AGENT })];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, $.tool.call({ tool: 'Grep', tool_use_id: 'toolu_g1', pattern: 'login', agentId: AGENT })];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, $.agent.spawn(spawnInput({ tool_use_id: 'toolu_nested', description: 'check tests', parentAgentId: AGENT }))];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, clock.advance(450)];
                case 5:
                    _a.sent();
                    return [2 /*return*/, clock];
            }
        });
    });
}
function noIds(text) {
    (0, testing_1.expect)(text).not.toContain('LEAKCHECK');
    (0, testing_1.expect)(text).not.toContain('toolu_');
    (0, testing_1.expect)(text).not.toContain('wf_');
}
function allText(ui) {
    return __awaiter(this, void 0, void 0, function () {
        var els;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, ui.findAll({})];
                case 1:
                    els = _a.sent();
                    return [2 /*return*/, els.map(function (el) { return "".concat(el.text, " ").concat(el.type === 'Svg' ? "".concat(String(el.props.source), " ").concat(String(el.props.alt)) : ''); }).join('\n')];
            }
        });
    });
}
var _loop_1 = function (surface) {
    (0, testing_1.test)("the pane is a tree of agents that expand, fold and show a transcript (".concat(surface, ")"), function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
        var ui, _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, svg, _q, _r, _s, _t;
        return __generator(this, function (_u) {
            switch (_u.label) {
                case 0: return [4 /*yield*/, seed($, on)];
                case 1:
                    _u.sent();
                    return [4 /*yield*/, $.ui.mount({ plugin: 'subagents-plus', surface: surface, component: 'Pane', requestId: 'subagents', props: PANE_PROPS })
                        // Rows (no main-loop events in this session): 1 the Explore agent, 2 the agent it spawned.
                    ];
                case 2:
                    ui = _u.sent();
                    // Rows (no main-loop events in this session): 1 the Explore agent, 2 the agent it spawned.
                    _a = testing_1.expect;
                    return [4 /*yield*/, ui.find({ key: 'row-1' })];
                case 3:
                    // Rows (no main-loop events in this session): 1 the Explore agent, 2 the agent it spawned.
                    _a.apply(void 0, [_u.sent()]).toBeDefined();
                    _b = testing_1.expect;
                    return [4 /*yield*/, ui.find({ key: 'row-2' })];
                case 4:
                    _b.apply(void 0, [_u.sent()]).toBeDefined();
                    _c = testing_1.expect;
                    return [4 /*yield*/, ui.find({ text: /└─/ })];
                case 5:
                    _c.apply(void 0, [_u.sent()]).toBeDefined();
                    _d = testing_1.expect;
                    return [4 /*yield*/, ui.find({ text: /1 live|2 live/ })];
                case 6:
                    _d.apply(void 0, [_u.sent()]).toBeDefined();
                    _e = noIds;
                    return [4 /*yield*/, allText(ui)];
                case 7:
                    _e.apply(void 0, [_u.sent()]);
                    return [4 /*yield*/, ui.press({ key: 'row-1' })];
                case 8:
                    _u.sent();
                    _f = testing_1.expect;
                    return [4 /*yield*/, ui.find({ text: /Recent calls/ })];
                case 9:
                    _f.apply(void 0, [_u.sent()]).toBeDefined();
                    _g = testing_1.expect;
                    return [4 /*yield*/, ui.find({ text: /session\.ts/ })];
                case 10:
                    _g.apply(void 0, [_u.sent()]).toBeDefined();
                    // Another agent opens while the first stays open.
                    return [4 /*yield*/, ui.press({ key: 'row-2' })];
                case 11:
                    // Another agent opens while the first stays open.
                    _u.sent();
                    _h = testing_1.expect;
                    return [4 /*yield*/, ui.find({ text: /from find auth code/ })];
                case 12:
                    _h.apply(void 0, [_u.sent()]).toBeDefined();
                    _j = testing_1.expect;
                    return [4 /*yield*/, ui.find({ key: 'act-1' })];
                case 13:
                    _j.apply(void 0, [_u.sent()]).toBeDefined();
                    return [4 /*yield*/, ui.press({ key: 'tx-1' })];
                case 14:
                    _u.sent();
                    _k = testing_1.expect;
                    return [4 /*yield*/, ui.find({ text: /Task: Find the auth code/ })];
                case 15:
                    _k.apply(void 0, [_u.sent()]).toBeDefined();
                    _l = noIds;
                    return [4 /*yield*/, allText(ui)];
                case 16:
                    _l.apply(void 0, [_u.sent()]);
                    return [4 /*yield*/, ui.press({ key: 'act-1' })];
                case 17:
                    _u.sent();
                    _m = testing_1.expect;
                    return [4 /*yield*/, ui.find({ text: /Task: Find the auth code/ })];
                case 18:
                    _m.apply(void 0, [_u.sent()]).toBeUndefined();
                    return [4 /*yield*/, ui.press({ key: 'fold-1' })];
                case 19:
                    _u.sent();
                    _o = testing_1.expect;
                    return [4 /*yield*/, ui.find({ key: 'row-2' })];
                case 20:
                    _o.apply(void 0, [_u.sent()]).toBeUndefined();
                    _p = testing_1.expect;
                    return [4 /*yield*/, ui.find({ text: /▸1/ })];
                case 21:
                    _p.apply(void 0, [_u.sent()]).toBeDefined();
                    return [4 /*yield*/, ui.press({ key: 'tab-timeline' })];
                case 22:
                    _u.sent();
                    if (!(surface === 'desktop')) return [3 /*break*/, 25];
                    return [4 /*yield*/, ui.find({ type: 'Svg' })];
                case 23:
                    svg = _u.sent();
                    _q = testing_1.expect;
                    _r = String;
                    return [4 /*yield*/, ui.findAll({ type: 'Svg' })];
                case 24:
                    _q.apply(void 0, [_r.apply(void 0, [(_u.sent()).map(function (el) { return el.props.alt; }).join('|')])]).toMatch(/Timeline/);
                    (0, testing_1.expect)(svg === null || svg === void 0 ? void 0 : svg.props.isInteractive).toBeUndefined();
                    return [3 /*break*/, 27];
                case 25:
                    _s = testing_1.expect;
                    return [4 /*yield*/, ui.find({ type: 'Raster' })];
                case 26:
                    _s.apply(void 0, [_u.sent()]).toBeDefined();
                    _u.label = 27;
                case 27: return [4 /*yield*/, ui.press({ key: 'tl-2' })];
                case 28:
                    _u.sent();
                    _t = testing_1.expect;
                    return [4 /*yield*/, ui.find({ key: 'row-2' })];
                case 29:
                    _t.apply(void 0, [_u.sent()]).toBeDefined();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, testing_1.test)("the band shows live agents, yields to a survey and keeps the band beneath (".concat(surface, ")"), function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
        var ui, _a, _b, _c, survey, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0: return [4 /*yield*/, seed($, on)];
                case 1:
                    _e.sent();
                    return [4 /*yield*/, $.ui.mount({ plugin: 'subagents-plus', surface: surface, component: 'AbovePrompt', requestId: 'band', props: BAND_PROPS })];
                case 2:
                    ui = _e.sent();
                    _a = testing_1.expect;
                    return [4 /*yield*/, ui.find({ text: /2 agents/ })];
                case 3:
                    _a.apply(void 0, [_e.sent()]).toBeDefined();
                    _b = testing_1.expect;
                    return [4 /*yield*/, ui.find({ key: 'engine-own' })];
                case 4:
                    _b.apply(void 0, [_e.sent()]).toBeDefined();
                    _c = noIds;
                    return [4 /*yield*/, allText(ui)];
                case 5:
                    _c.apply(void 0, [_e.sent()]);
                    return [4 /*yield*/, $.ui.mount({ plugin: 'subagents-plus', surface: surface, component: 'AbovePrompt', requestId: 'band2', props: __assign(__assign({}, BAND_PROPS), { hasSurvey: true }) })];
                case 6:
                    survey = _e.sent();
                    _d = testing_1.expect;
                    return [4 /*yield*/, survey.find({ text: /agents/ })];
                case 7:
                    _d.apply(void 0, [_e.sent()]).toBeUndefined();
                    return [2 /*return*/];
            }
        });
    }); });
};
for (var _i = 0, _a = ['terminal', 'desktop']; _i < _a.length; _i++) {
    var surface = _a[_i];
    _loop_1(surface);
}
(0, testing_1.test)('the Agent row card draws for a known call and leaves an unknown finished row alone', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var ui, _a, _b, _c, _d, other, _e, _f, term, _g;
    return __generator(this, function (_h) {
        switch (_h.label) {
            case 0: return [4 /*yield*/, seed($, on)];
            case 1:
                _h.sent();
                return [4 /*yield*/, $.ui.mount({ plugin: 'subagents-plus', surface: 'desktop', component: 'ToolUse', requestId: TOOL_USE, props: ROW_PROPS })];
            case 2:
                ui = _h.sent();
                _a = testing_1.expect;
                return [4 /*yield*/, ui.find({ text: /Explore/ })];
            case 3:
                _a.apply(void 0, [_h.sent()]).toBeDefined();
                _b = testing_1.expect;
                return [4 /*yield*/, ui.find({ text: /2 tools/ })];
            case 4:
                _b.apply(void 0, [_h.sent()]).toBeDefined();
                _c = testing_1.expect;
                return [4 /*yield*/, ui.find({ key: 'engine-own' })];
            case 5:
                _c.apply(void 0, [_h.sent()]).toBeDefined();
                _d = noIds;
                return [4 /*yield*/, allText(ui)];
            case 6:
                _d.apply(void 0, [_h.sent()]);
                return [4 /*yield*/, $.ui.mount({ plugin: 'subagents-plus', surface: 'desktop', component: 'ToolUse', requestId: 'toolu_other', props: __assign(__assign({}, ROW_PROPS), { tool_use_id: 'toolu_other', isRunning: false }) })];
            case 7:
                other = _h.sent();
                _e = testing_1.expect;
                return [4 /*yield*/, other.find({ text: /Explore/ })];
            case 8:
                _e.apply(void 0, [_h.sent()]).toBeUndefined();
                _f = testing_1.expect;
                return [4 /*yield*/, other.find({ key: 'engine-own' })];
            case 9:
                _f.apply(void 0, [_h.sent()]).toBeDefined();
                return [4 /*yield*/, $.ui.mount({ plugin: 'subagents-plus', surface: 'terminal', component: 'ToolUse', requestId: TOOL_USE, props: ROW_PROPS })];
            case 10:
                term = _h.sent();
                _g = testing_1.expect;
                return [4 /*yield*/, term.find({ text: /Explore/ })];
            case 11:
                _g.apply(void 0, [_h.sent()]).toBeUndefined();
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('a finished agent settles: tokens counted once, status done', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var clock, usage, ui, _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0: return [4 /*yield*/, seed($, on)];
            case 1:
                clock = _c.sent();
                usage = { input_tokens: 1000, output_tokens: 200, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, model: 'claude-sonnet-5-5' };
                return [4 /*yield*/, $.turn.complete({ answer: 'Found it in session.ts', durationMs: 4000, isAborted: false, turnId: 't1', agentId: AGENT, usage: usage, reason: 'answer' })];
            case 2:
                _c.sent();
                return [4 /*yield*/, $.turn.complete({ answer: 'Found it in session.ts', durationMs: 4000, isAborted: false, turnId: 't1', agentId: AGENT, usage: usage, reason: 'answer' })];
            case 3:
                _c.sent();
                return [4 /*yield*/, clock.advance(450)];
            case 4:
                _c.sent();
                return [4 /*yield*/, $.ui.mount({ plugin: 'subagents-plus', surface: 'desktop', component: 'Pane', requestId: 'subagents', props: PANE_PROPS })];
            case 5:
                ui = _c.sent();
                return [4 /*yield*/, ui.press({ key: 'row-1' })];
            case 6:
                _c.sent();
                _a = testing_1.expect;
                return [4 /*yield*/, ui.find({ text: /1\.2k tokens/ })];
            case 7:
                _a.apply(void 0, [_c.sent()]).toBeDefined();
                _b = testing_1.expect;
                return [4 /*yield*/, ui.find({ text: /done/ })];
            case 8:
                _b.apply(void 0, [_c.sent()]).toBeDefined();
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('options turn the band and the cards off', { options: { band: false, inlineCards: 'off' } }, function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var band, _a, row, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0: return [4 /*yield*/, seed($, on)];
            case 1:
                _c.sent();
                return [4 /*yield*/, $.ui.mount({ plugin: 'subagents-plus', surface: 'desktop', component: 'AbovePrompt', requestId: 'band', props: BAND_PROPS })];
            case 2:
                band = _c.sent();
                _a = testing_1.expect;
                return [4 /*yield*/, band.find({ text: /agents/ })];
            case 3:
                _a.apply(void 0, [_c.sent()]).toBeUndefined();
                return [4 /*yield*/, $.ui.mount({ plugin: 'subagents-plus', surface: 'desktop', component: 'ToolUse', requestId: TOOL_USE, props: ROW_PROPS })];
            case 4:
                row = _c.sent();
                _b = testing_1.expect;
                return [4 /*yield*/, row.find({ text: /Explore/ })];
            case 5:
                _b.apply(void 0, [_c.sent()]).toBeUndefined();
                return [2 /*return*/];
        }
    });
}); });
