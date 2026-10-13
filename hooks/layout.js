"use strict";
// Sizes and limits every drawing shares. Pure: no `$`.
Object.defineProperty(exports, "__esModule", { value: true });
exports.SVG_MINI_MAX = exports.SVG_PAGE_BUDGET = exports.SVG_ELEMENT_MAX = exports.PX_PER_COLUMN = void 0;
exports.pxWidth = pxWidth;
exports.axisEnd = axisEnd;
exports.niceStep = niceStep;
exports.axisLabel = axisLabel;
/** CSS pixels per character column on the desktop: a Svg sized from bodyColumns fits its pane. */
exports.PX_PER_COLUMN = 8;
/** One Svg's source is refused past 131,072 characters; stay well under (canvas measured 120k as safe). */
exports.SVG_ELEMENT_MAX = 120000;
/** All the Svg one pane draws together. */
exports.SVG_PAGE_BUDGET = 240000;
/** Inline cards and the band are small, static pictures. */
exports.SVG_MINI_MAX = 4000;
/** Pixel width for a site `columns` wide, within sane bounds. */
function pxWidth(columns, minus) {
    if (minus === void 0) { minus = 0; }
    return Math.max(200, Math.min(1600, Math.round((columns - minus) * exports.PX_PER_COLUMN)));
}
/**
 * The time axis' right end: now plus a quarter of the elapsed span (30 s at
 * least), kept while it still holds now, so a tick that adds nothing redraws
 * the identical picture.
 */
function axisEnd(t0, now, previous) {
    if (previous !== undefined && previous > now && previous - t0 < (now - t0) * 2 + 60000)
        return previous;
    return now + Math.max(30000, Math.round((now - t0) * 0.25));
}
var STEPS_S = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600, 7200, 14400];
/** A round tick interval (ms) giving at most `maxTicks` ticks over `spanMs`. */
function niceStep(spanMs, maxTicks) {
    for (var _i = 0, STEPS_S_1 = STEPS_S; _i < STEPS_S_1.length; _i++) {
        var s = STEPS_S_1[_i];
        if (spanMs / (s * 1000) <= Math.max(1, maxTicks))
            return s * 1000;
    }
    return STEPS_S[STEPS_S.length - 1] * 1000;
}
/** An axis label for an offset from the start: `0s`, `45s`, `1:30`, `1h`, `1h30`. */
function axisLabel(ms) {
    var s = Math.round(ms / 1000);
    if (s < 60)
        return "".concat(s, "s");
    if (s < 3600)
        return "".concat(Math.floor(s / 60), ":").concat(String(s % 60).padStart(2, '0'));
    var m = Math.floor((s % 3600) / 60);
    return m === 0 ? "".concat(Math.floor(s / 3600), "h") : "".concat(Math.floor(s / 3600), "h").concat(String(m).padStart(2, '0'));
}
