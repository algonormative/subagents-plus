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
var raster_1 = require("./raster");
var svg_mini_1 = require("./svg-mini");
var svg_timeline_1 = require("./svg-timeline");
var T0 = 1800000000000;
var KINDS = ['read', 'search', 'edit', 'write', 'bash', 'web', 'mcp', 'agent', 'other'];
function spans(n, from, summary) {
    if (summary === void 0) { summary = 'file.ts'; }
    return Array.from({ length: n }, function (_, i) { return (__assign({ id: "toolu_".concat(from, "_").concat(i), kind: KINDS[i % KINDS.length], tool: 'Read', summary: summary, start: from + i * 300, end: from + i * 300 + 200 }, (i % 17 === 0 ? { isError: true } : {}))); });
}
function lane(key, depth, n, over) {
    if (over === void 0) { over = {}; }
    return __assign({ t: 'lane', key: key, label: "agent ".concat(key), depth: depth, color: depth === 0 ? -1 : depth, status: 'completed', isMain: key === 'main', start: T0, end: T0 + n * 300 + 500, runs: [{ start: T0, end: T0 + n * 300 }], steps: [{ start: T0, end: T0 + 100 }], spans: spans(n, T0), rollups: [], keep: depth }, over);
}
var OPTS = { width: 900, now: T0 + 120000, t0: T0, t1: T0 + 150000, animate: true };
/** Every opened tag closes: a small tokenizer, not a parser. */
function balanced(svg) {
    var stack = [];
    for (var _i = 0, _a = svg.replace(/<style>[\s\S]*?<\/style>/g, '').matchAll(/<(\/?)([a-zA-Z]+)[^>]*?(\/?)>/g); _i < _a.length; _i++) {
        var m = _a[_i];
        var close_1 = m[1], name_1 = m[2], self_1 = m[3];
        if (self_1)
            continue;
        if (close_1) {
            if (stack.pop() !== name_1)
                return false;
        }
        else
            stack.push(name_1);
    }
    return stack.length === 0;
}
(0, testing_1.test)('a small timeline draws every tick with tooltips and live animation', function () { return __awaiter(void 0, void 0, void 0, function () {
    var rows, b;
    return __generator(this, function (_a) {
        rows = [lane('main', 0, 5), lane('a', 1, 12, { status: 'running', end: undefined }), { t: 'group', label: 'audit', depth: 1 }, lane('b', 2, 3)];
        b = (0, svg_timeline_1.buildTimelineSvg)(rows, OPTS);
        (0, testing_1.expect)(b.level).toBe(0);
        (0, testing_1.expect)(b.source.startsWith('<svg')).toBe(true);
        (0, testing_1.expect)(b.source.endsWith('</svg>')).toBe(true);
        (0, testing_1.expect)(balanced(b.source)).toBe(true);
        (0, testing_1.expect)(b.source).toContain('<title>');
        (0, testing_1.expect)(b.source).toContain('<animate');
        (0, testing_1.expect)(b.source).toContain('◇ audit');
        (0, testing_1.expect)(b.source).not.toMatch(/NaN|undefined/);
        return [2 /*return*/];
    });
}); });
(0, testing_1.test)('without animation or live lanes no SMIL is drawn', function () { return __awaiter(void 0, void 0, void 0, function () {
    var still, done;
    return __generator(this, function (_a) {
        still = (0, svg_timeline_1.buildTimelineSvg)([lane('main', 0, 5), lane('a', 1, 12, { status: 'running', end: undefined })], __assign(__assign({}, OPTS), { animate: false }));
        (0, testing_1.expect)(still.source).not.toContain('<animate');
        done = (0, svg_timeline_1.buildTimelineSvg)([lane('a', 1, 12)], OPTS);
        (0, testing_1.expect)(done.source).not.toContain('repeatCount');
        return [2 /*return*/];
    });
}); });
(0, testing_1.test)('a huge session stays under the Svg limit and says what it left out', function () { return __awaiter(void 0, void 0, void 0, function () {
    var rows, i, b;
    return __generator(this, function (_a) {
        rows = [lane('main', 0, 2000)];
        for (i = 0; i < 200; i++)
            rows.push(lane("x".concat(i), 1 + (i % 3), 2000, { keep: 10 + i }));
        b = (0, svg_timeline_1.buildTimelineSvg)(rows, OPTS);
        (0, testing_1.expect)(b.source.length).toBeLessThanOrEqual(120000);
        (0, testing_1.expect)(b.level).toBeGreaterThanOrEqual(3);
        (0, testing_1.expect)(b.source).toMatch(/more agent|too much activity/);
        (0, testing_1.expect)(balanced(b.source)).toBe(true);
        return [2 /*return*/];
    });
}); });
(0, testing_1.test)('text from tool input is escaped, never markup', function () { return __awaiter(void 0, void 0, void 0, function () {
    var evil, b;
    return __generator(this, function (_a) {
        evil = lane('a', 1, 3, { label: '<script>alert(1)</script>', spans: spans(3, T0, '"><script>x</script><g onload="y"') });
        b = (0, svg_timeline_1.buildTimelineSvg)([evil], OPTS);
        (0, testing_1.expect)(b.source).not.toContain('<script');
        // No tag carries an event attribute: input text stays inside escaped text.
        (0, testing_1.expect)(b.source).not.toMatch(/<[^>]*\son\w+=/);
        (0, testing_1.expect)(b.source).toContain('&lt;script&gt;');
        return [2 /*return*/];
    });
}); });
(0, testing_1.test)('width follows the pane and identical input builds an identical picture', function () { return __awaiter(void 0, void 0, void 0, function () {
    var rows;
    return __generator(this, function (_a) {
        rows = [lane('main', 0, 5), lane('a', 1, 8)];
        (0, testing_1.expect)((0, svg_timeline_1.buildTimelineSvg)(rows, __assign(__assign({}, OPTS), { width: 320 })).source).toContain('width="320"');
        (0, testing_1.expect)((0, svg_timeline_1.buildTimelineSvg)(rows, __assign(__assign({}, OPTS), { width: 960 })).source).toContain('width="960"');
        (0, testing_1.expect)((0, svg_timeline_1.buildTimelineSvg)(rows, OPTS).source).toBe((0, svg_timeline_1.buildTimelineSvg)(rows, OPTS).source);
        return [2 /*return*/];
    });
}); });
(0, testing_1.test)('mini pictures stay small and the activity window slides', function () { return __awaiter(void 0, void 0, void 0, function () {
    var strip, act, spark;
    return __generator(this, function (_a) {
        strip = (0, svg_mini_1.cardStripSvg)(spans(5000, T0), { width: 600, t0: T0, now: T0 + 2000000, color: 2, live: true });
        (0, testing_1.expect)(strip.length).toBeLessThanOrEqual(4000);
        (0, testing_1.expect)(balanced(strip)).toBe(true);
        act = (0, svg_mini_1.foldActivity)([], spans(40, T0).map(function (s) { return ({ at: s.start, kind: s.kind }); }), T0 + 12000);
        (0, testing_1.expect)(act.reduce(function (n, b) { return n + Object.values(b.counts).reduce(function (a, v) { return a + (v !== null && v !== void 0 ? v : 0); }, 0); }, 0)).toBe(40);
        act = (0, svg_mini_1.foldActivity)(act, [], T0 + 600000);
        (0, testing_1.expect)(act).toEqual([]);
        spark = (0, svg_mini_1.sparklineSvg)((0, svg_mini_1.foldActivity)([], spans(40, T0).map(function (s) { return ({ at: s.start, kind: s.kind }); }), T0 + 12000), T0 + 12000, 160);
        (0, testing_1.expect)(spark.length).toBeLessThanOrEqual(4000);
        return [2 /*return*/];
    });
}); });
(0, testing_1.test)('terminal rasters pack whole cells of printable glyphs', function () { return __awaiter(void 0, void 0, void 0, function () {
    var packed, tl, sp;
    return __generator(this, function (_a) {
        packed = (0, raster_1.packCells)([[0x2588, 0xff8800, 0x01000000]], 1, 1);
        (0, testing_1.expect)(packed).toBe('iCUAAACI/wAAAAAB');
        tl = (0, raster_1.timelineCells)([{ color: 1, status: 'running', live: true, start: T0, spans: spans(30, T0), steps: [] }], { columns: 40, t0: T0, t1: T0 + 20000, now: T0 + 10000 });
        (0, testing_1.expect)(tl.columns).toBe(40);
        (0, testing_1.expect)(tl.rows).toBe(1);
        // 40 cells x 12 bytes = 480 bytes = 640 base64 characters.
        (0, testing_1.expect)(tl.cells.length).toBe(640);
        sp = (0, raster_1.sparkCells)([{ at: T0, counts: { read: 3 } }], T0 + 1000, 24);
        (0, testing_1.expect)(sp.cells.length).toBe(Math.ceil((24 * 12) / 3) * 4);
        return [2 /*return*/];
    });
}); });
