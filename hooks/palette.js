"use strict";
// Colors: agent identity (one per lane, cycling) and tool kind. Taken from the
// Endless Bounty theme, whose *_FOR_SUBAGENTS_ONLY keys are the engine's own
// subagent colors, dark values first and light ones for a light page.
// Pure: no `$`.
Object.defineProperty(exports, "__esModule", { value: true });
exports.MINI_STYLE = exports.STYLE = exports.STATUS_SWATCH = exports.KIND_SWATCH = exports.IDENTITY = exports.MAIN_SWATCH = void 0;
exports.identity = identity;
exports.textColor = textColor;
exports.shimmerDef = shimmerDef;
exports.idClass = idClass;
/** Main loop: the theme's claude orange. */
exports.MAIN_SWATCH = { dark: '#e07b39', light: '#d05010', key: 'claude' };
/** Subagent identities, in assignment order. Red is left out: it means failure here. */
exports.IDENTITY = [
    { dark: '#7090b0', light: '#2050a0', key: 'blue_FOR_SUBAGENTS_ONLY' },
    { dark: '#8cb369', light: '#2d7818', key: 'green_FOR_SUBAGENTS_ONLY' },
    { dark: '#e0a458', light: '#b07020', key: 'yellow_FOR_SUBAGENTS_ONLY' },
    { dark: '#9b6b9e', light: '#7030a0', key: 'purple_FOR_SUBAGENTS_ONLY' },
    { dark: '#609888', light: '#108868', key: 'cyan_FOR_SUBAGENTS_ONLY' },
    { dark: '#d87070', light: '#d83030', key: 'pink_FOR_SUBAGENTS_ONLY' },
    { dark: '#b89a6a', light: '#8a6a30' },
];
exports.KIND_SWATCH = {
    read: { dark: '#7090b0', light: '#2050a0' },
    search: { dark: '#609888', light: '#108868' },
    edit: { dark: '#e0a458', light: '#b07020' },
    write: { dark: '#e07b39', light: '#d05010' },
    bash: { dark: '#9b6b9e', light: '#7030a0' },
    web: { dark: '#8cb369', light: '#2d7818' },
    mcp: { dark: '#d87070', light: '#d83030' },
    agent: { dark: '#dcc8a8', light: '#6a5a40' },
    other: { dark: '#7d8471', light: '#788068' },
};
exports.STATUS_SWATCH = {
    ok: { dark: '#8cb369', light: '#2d7818' },
    error: { dark: '#c75d5d', light: '#c03030' },
    muted: { dark: '#7d8471', light: '#788068' },
    fg: { dark: '#dcc8a8', light: '#3a3225' },
    axis: { dark: '#8c8478', light: '#7a7060' },
    track: { dark: '#7d8471', light: '#788068' },
};
function identity(color) {
    var _a;
    return color < 0 ? exports.MAIN_SWATCH : (_a = exports.IDENTITY[color % exports.IDENTITY.length]) !== null && _a !== void 0 ? _a : exports.IDENTITY[0];
}
/** What a desktop Text names for a lane: its dark hex (the desktop app keeps its own contrast). */
function textColor(color, surface) {
    var s = identity(color);
    return surface === 'terminal' && s.key ? s.key : s.dark;
}
var KINDS = Object.keys(exports.KIND_SWATCH);
/**
 * The stylesheet every drawing shares: identity classes `fi0`..`fi6`/`fim`
 * (fill) and `si*` (stroke), kind classes `k-read`..., and the text classes.
 * Dark values by default; a light page swaps them.
 */
function sheet(scheme) {
    var out = [];
    var pick = function (s) { return (scheme === 'dark' ? s.dark : s.light); };
    exports.IDENTITY.forEach(function (s, i) { return out.push(".fi".concat(i, "{fill:").concat(pick(s), "}.si").concat(i, "{stroke:").concat(pick(s), "}")); });
    out.push(".fim{fill:".concat(pick(exports.MAIN_SWATCH), "}.sim{stroke:").concat(pick(exports.MAIN_SWATCH), "}"));
    exports.IDENTITY.forEach(function (s, i) { return out.push(".st".concat(i, "{stop-color:").concat(pick(s), "}")); });
    out.push(".stm{stop-color:".concat(pick(exports.MAIN_SWATCH), "}.st-fg{stop-color:").concat(pick(exports.STATUS_SWATCH.fg), "}"));
    for (var _i = 0, KINDS_1 = KINDS; _i < KINDS_1.length; _i++) {
        var k = KINDS_1[_i];
        out.push(".k-".concat(k, "{fill:").concat(pick(exports.KIND_SWATCH[k]), "}.sk-").concat(k, "{stroke:").concat(pick(exports.KIND_SWATCH[k]), "}"));
    }
    out.push(".fg{fill:".concat(pick(exports.STATUS_SWATCH.fg), "}.ax{fill:").concat(pick(exports.STATUS_SWATCH.axis), "}.sax{stroke:").concat(pick(exports.STATUS_SWATCH.axis), "}"), ".ok{fill:".concat(pick(exports.STATUS_SWATCH.ok), "}.err{fill:").concat(pick(exports.STATUS_SWATCH.error), "}.serr{stroke:").concat(pick(exports.STATUS_SWATCH.error), "}"), ".mut{fill:".concat(pick(exports.STATUS_SWATCH.muted), "}.trk{fill:").concat(pick(exports.STATUS_SWATCH.track), "}.strk{stroke:").concat(pick(exports.STATUS_SWATCH.track), "}"));
    return out.join('');
}
exports.STYLE = "text{font-family:-apple-system,BlinkMacSystemFont,\"SF Pro Text\",\"Segoe UI\",sans-serif}" +
    sheet('dark') +
    "@media (prefers-color-scheme: light){".concat(sheet('light'), "}");
/**
 * A gradient that sweeps the agent's color across text drawn in the page's
 * foreground: a live agent's name shimmers. `width` is the text's extent.
 */
function shimmerDef(id, color, x, width, animate) {
    var w = Math.max(40, Math.round(width));
    var sweep = animate
        ? "<animateTransform attributeName=\"gradientTransform\" type=\"translate\" from=\"".concat(-w, " 0\" to=\"").concat(w, " 0\" dur=\"2.4s\" repeatCount=\"indefinite\"/>")
        : '';
    return "<linearGradient id=\"".concat(id, "\" gradientUnits=\"userSpaceOnUse\" x1=\"").concat(x, "\" y1=\"0\" x2=\"").concat(x + w, "\" y2=\"0\">") +
        "<stop offset=\"0\" class=\"st-fg\"/><stop offset=\".4\" class=\"st-fg\"/><stop offset=\".5\" class=\"st".concat(idClass(color), "\"/>") +
        "<stop offset=\".6\" class=\"st-fg\"/><stop offset=\"1\" class=\"st-fg\"/>".concat(sweep, "</linearGradient>");
}
/** Fill classes alone (identity, kind, err, trk): the small pictures' stylesheet. */
function fills(scheme) {
    var pick = function (s) { return (scheme === 'dark' ? s.dark : s.light); };
    return exports.IDENTITY.map(function (s, i) { return ".fi".concat(i, "{fill:").concat(pick(s), "}"); }).join('') +
        ".fim{fill:".concat(pick(exports.MAIN_SWATCH), "}") +
        KINDS.map(function (k) { return ".k-".concat(k, "{fill:").concat(pick(exports.KIND_SWATCH[k]), "}"); }).join('') +
        ".err{fill:".concat(pick(exports.STATUS_SWATCH.error), "}.trk{fill:").concat(pick(exports.STATUS_SWATCH.track), "}");
}
exports.MINI_STYLE = fills('dark') + "@media (prefers-color-scheme: light){".concat(fills('light'), "}");
/** The class suffix of a lane's identity: `0`..`6`, or `m` for main. */
function idClass(color) {
    return color < 0 ? 'm' : String(color % exports.IDENTITY.length);
}
