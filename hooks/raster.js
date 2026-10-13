"use strict";
// The terminal's pictures: a Raster per drawing, cells packed as the engine
// takes them (base64 of little-endian u32 triplets [codePoint, fg, bg]).
// Pure: no `$`.
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
exports.packCells = packCells;
exports.timelineCells = timelineCells;
exports.sparkCells = sparkCells;
var palette_1 = require("./palette");
var svg_mini_1 = require("./svg-mini");
var DEFAULT = 0x01000000;
function hex(c) {
    return parseInt(c.slice(1), 16) & 0xffffff;
}
var B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function base64(bytes) {
    var out = '';
    for (var i = 0; i < bytes.length; i += 3) {
        var a = bytes[i];
        var b = bytes[i + 1];
        var c = bytes[i + 2];
        out += B64[a >> 2] + B64[((a & 3) << 4) | ((b !== null && b !== void 0 ? b : 0) >> 4)];
        out += b === undefined ? '=' : B64[((b & 15) << 2) | ((c !== null && c !== void 0 ? c : 0) >> 6)];
        out += c === undefined ? '=' : B64[c & 63];
    }
    return out;
}
/** Packs a grid (row-major, every row `columns` long) as Raster `cells`. */
function packCells(grid, columns, rows) {
    var _a;
    var words = new Uint32Array(columns * rows * 3);
    for (var i = 0; i < columns * rows; i++) {
        var cell = (_a = grid[i]) !== null && _a !== void 0 ? _a : [0x20, DEFAULT, DEFAULT];
        words[i * 3] = cell[0];
        words[i * 3 + 1] = cell[1];
        words[i * 3 + 2] = cell[2];
    }
    return base64(new Uint8Array(words.buffer));
}
/**
 * One row per lane, one cell per time bucket: `█` in the dominant tool kind's
 * color where calls ran, `░` in the agent's color for model time, `·` alive and
 * idle, `▶` for a live head.
 */
function timelineCells(lanes, o) {
    var columns = Math.max(1, Math.min(512, o.columns));
    var rows = Math.max(1, Math.min(256, lanes.length));
    var span = Math.max(1000, o.t1 - o.t0);
    var col = function (t) { return Math.max(0, Math.min(columns - 1, Math.floor(((t - o.t0) / span) * columns))); };
    var grid = new Array(columns * rows);
    lanes.slice(0, rows).forEach(function (lane, r) {
        var _a, _b, _c, _d, _e;
        var id = hex((0, palette_1.identity)(lane.color).dark);
        var kinds = new Array(columns);
        var model = new Array(columns).fill(false);
        for (var _i = 0, _f = lane.spans; _i < _f.length; _i++) {
            var s = _f[_i];
            for (var c = col(s.start); c <= col((_a = s.end) !== null && _a !== void 0 ? _a : o.now); c++) {
                var k = ((_b = kinds[c]) !== null && _b !== void 0 ? _b : (kinds[c] = {}));
                k[s.kind] = ((_c = k[s.kind]) !== null && _c !== void 0 ? _c : 0) + 1;
            }
        }
        for (var _g = 0, _h = lane.steps; _g < _h.length; _g++) {
            var s = _h[_g];
            for (var c = col(s.start); c <= col((_d = s.end) !== null && _d !== void 0 ? _d : o.now); c++)
                model[c] = true;
        }
        var a = col(lane.start);
        var b = col((_e = lane.end) !== null && _e !== void 0 ? _e : o.now);
        for (var c = 0; c < columns; c++) {
            var cell = [0x20, DEFAULT, DEFAULT];
            var k = kinds[c];
            if (k) {
                var best = 'other';
                var n = -1;
                for (var _j = 0, _k = Object.entries(k); _j < _k.length; _j++) {
                    var _l = _k[_j], kk = _l[0], v = _l[1];
                    if (v > n) {
                        best = kk;
                        n = v;
                    }
                }
                cell = [0x2588, hex(palette_1.KIND_SWATCH[best].dark), DEFAULT];
            }
            else if (model[c])
                cell = [0x2591, id, DEFAULT];
            else if (c >= a && c <= b)
                cell = [0x00b7, id, DEFAULT];
            grid[r * columns + c] = cell;
        }
        if (lane.live)
            grid[r * columns + col(o.now)] = [0x25b6, id, DEFAULT];
    });
    return { cells: packCells(grid, columns, rows), columns: columns, rows: rows };
}
/** One row of ▁▂▃▄▅▆▇█ for tool calls per 5 s over two minutes. */
function sparkCells(activity, now, columns) {
    var _a;
    if (columns === void 0) { columns = 24; }
    var n = Math.max(1, Math.min(512, columns));
    var start = Math.floor(now / svg_mini_1.ACTIVITY_BUCKET_MS) * svg_mini_1.ACTIVITY_BUCKET_MS - (Math.round(svg_mini_1.ACTIVITY_WINDOW_MS / svg_mini_1.ACTIVITY_BUCKET_MS) - 1) * svg_mini_1.ACTIVITY_BUCKET_MS;
    var per = Math.round(svg_mini_1.ACTIVITY_WINDOW_MS / svg_mini_1.ACTIVITY_BUCKET_MS) / n;
    var totals = new Array(n).fill(0);
    var tops = new Array(n);
    for (var _i = 0, activity_1 = activity; _i < activity_1.length; _i++) {
        var b = activity_1[_i];
        var i = Math.floor((b.at - start) / svg_mini_1.ACTIVITY_BUCKET_MS / per);
        if (i < 0 || i >= n)
            continue;
        for (var _b = 0, _c = Object.entries(b.counts); _b < _c.length; _b++) {
            var _d = _c[_b], k = _d[0], v = _d[1];
            totals[i] += v;
            if (!tops[i] || ((_a = b.counts[tops[i]]) !== null && _a !== void 0 ? _a : 0) < v)
                tops[i] = k;
        }
    }
    var max = Math.max.apply(Math, __spreadArray([1], totals, false));
    var grid = totals.map(function (t, i) { var _a; return t === 0 ? [0x2581, hex('#5a5045'), DEFAULT] : [0x2581 + Math.min(7, Math.round((t / max) * 7)), hex(palette_1.KIND_SWATCH[(_a = tops[i]) !== null && _a !== void 0 ? _a : 'other'].dark), DEFAULT]; });
    return { cells: packCells(grid, n, 1), columns: n, rows: 1 };
}
