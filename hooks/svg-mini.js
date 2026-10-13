"use strict";
// Small static pictures: the tick strip on an inline Agent card and the
// activity sparkline in the band and the stats strip. No animation (they are
// redrawn often and drawn as plain images). Pure: no `$`.
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
exports.ACTIVITY_WINDOW_MS = exports.ACTIVITY_BUCKET_MS = void 0;
exports.foldActivity = foldActivity;
exports.sparklineSvg = sparklineSvg;
exports.cardStripSvg = cardStripSvg;
var kinds_1 = require("./kinds");
var layout_1 = require("./layout");
var palette_1 = require("./palette");
exports.ACTIVITY_BUCKET_MS = 5000;
exports.ACTIVITY_WINDOW_MS = 120000;
/** Adds tool starts to the activity buckets and drops buckets older than the window. */
function foldActivity(prev, starts, now) {
    var _a, _b;
    var byAt = new Map(prev.map(function (b) { return [b.at, { at: b.at, counts: __assign({}, b.counts) }]; }));
    for (var _i = 0, starts_1 = starts; _i < starts_1.length; _i++) {
        var s = starts_1[_i];
        var at = Math.floor(s.at / exports.ACTIVITY_BUCKET_MS) * exports.ACTIVITY_BUCKET_MS;
        var b = (_a = byAt.get(at)) !== null && _a !== void 0 ? _a : { at: at, counts: {} };
        b.counts[s.kind] = ((_b = b.counts[s.kind]) !== null && _b !== void 0 ? _b : 0) + 1;
        byAt.set(at, b);
    }
    var floor = now - exports.ACTIVITY_WINDOW_MS - exports.ACTIVITY_BUCKET_MS;
    return __spreadArray([], byAt.values(), true).filter(function (b) { return b.at >= floor; }).sort(function (a, b) { return a.at - b.at; });
}
/** Stacked bars of tool calls per 5 s over the last two minutes, colored by kind. */
function sparklineSvg(activity, now, width, height) {
    var _a;
    if (height === void 0) { height = 18; }
    var w = Math.max(60, Math.round(width));
    var n = Math.round(exports.ACTIVITY_WINDOW_MS / exports.ACTIVITY_BUCKET_MS);
    var bw = w / n;
    var start = Math.floor(now / exports.ACTIVITY_BUCKET_MS) * exports.ACTIVITY_BUCKET_MS - (n - 1) * exports.ACTIVITY_BUCKET_MS;
    var max = 1;
    for (var _i = 0, activity_1 = activity; _i < activity_1.length; _i++) {
        var b = activity_1[_i];
        max = Math.max(max, Object.values(b.counts).reduce(function (s, v) { return s + (v !== null && v !== void 0 ? v : 0); }, 0));
    }
    var out = ["<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"".concat(w, "\" height=\"").concat(height, "\" viewBox=\"0 0 ").concat(w, " ").concat(height, "\"><style>").concat(palette_1.MINI_STYLE, "</style>")];
    out.push("<rect x=\"0\" y=\"".concat(height - 1, "\" width=\"").concat(w, "\" height=\"1\" class=\"trk\" fill-opacity=\".35\"/>"));
    for (var _b = 0, activity_2 = activity; _b < activity_2.length; _b++) {
        var b = activity_2[_b];
        var i = Math.round((b.at - start) / exports.ACTIVITY_BUCKET_MS);
        if (i < 0 || i >= n)
            continue;
        var y = height - 1;
        for (var _c = 0, KIND_ORDER_1 = kinds_1.KIND_ORDER; _c < KIND_ORDER_1.length; _c++) {
            var k = KIND_ORDER_1[_c];
            var v = (_a = b.counts[k]) !== null && _a !== void 0 ? _a : 0;
            if (!v)
                continue;
            var h = Math.max(1, Math.round(((height - 2) * v) / max));
            y -= h;
            out.push("<rect x=\"".concat(Math.round(i * bw), "\" y=\"").concat(y, "\" width=\"").concat(Math.max(1, Math.round(bw) - 1), "\" height=\"").concat(h, "\" class=\"k-").concat(k, "\"/>"));
        }
    }
    out.push('</svg>');
    var s = out.join('');
    return s.length <= layout_1.SVG_MINI_MAX ? s : out.slice(0, 2).join('') + '</svg>';
}
/** A lane's recent tool calls as ticks on its alive track, for an inline card. */
function cardStripSvg(spans, o) {
    var _a, _b, _c;
    var w = Math.max(80, Math.round(o.width));
    var h = 14;
    var id = (0, palette_1.idClass)(o.color);
    var t1 = Math.max(((_a = o.end) !== null && _a !== void 0 ? _a : o.now) + 1000, o.t0 + 10000);
    var x = function (t) { return Math.round(((Math.max(o.t0, Math.min(t1, t)) - o.t0) / (t1 - o.t0)) * (w - 8)); };
    var head = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"".concat(w, "\" height=\"").concat(h, "\" viewBox=\"0 0 ").concat(w, " ").concat(h, "\"><style>").concat(palette_1.MINI_STYLE, "</style>") +
        "<rect x=\"0\" y=\"2\" width=\"".concat(Math.max(2, x((_b = o.end) !== null && _b !== void 0 ? _b : o.now)), "\" height=\"10\" rx=\"3\" class=\"fi").concat(id, "\" fill-opacity=\".18\"/>");
    var tail = (o.live ? "<circle cx=\"".concat(x(o.now), "\" cy=\"7\" r=\"3.5\" class=\"fi").concat(id, "\"/>") : '') + '</svg>';
    var ticks = [];
    var size = head.length + tail.length;
    // Newest first until the budget is spent, then drawn oldest first.
    for (var i = spans.length - 1; i >= 0; i--) {
        var s = spans[i];
        var sx = x(s.start);
        var t = "<rect x=\"".concat(sx, "\" y=\"4\" width=\"").concat(Math.max(2, x((_c = s.end) !== null && _c !== void 0 ? _c : o.now) - sx), "\" height=\"6\" class=\"k-").concat(s.kind, "\"/>") +
            (s.isError ? "<rect x=\"".concat(sx, "\" y=\"2\" width=\"2\" height=\"2\" class=\"err\"/>") : '');
        if (size + t.length > layout_1.SVG_MINI_MAX)
            break;
        size += t.length;
        ticks.push(t);
    }
    return head + ticks.reverse().join('') + tail;
}
