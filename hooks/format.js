"use strict";
// Pure text helpers: nothing a person reads is built without passing here.
// Ids never reach the screen; label() is the one place a lane gets a name.
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitize = sanitize;
exports.scrubSecrets = scrubSecrets;
exports.tildeHome = tildeHome;
exports.clip = clip;
exports.xmlEscape = xmlEscape;
exports.fmtDuration = fmtDuration;
exports.fmtTokens = fmtTokens;
exports.label = label;
// C0 and C1 controls, plus the bidi overrides and isolates that can reorder text.
var UNSAFE = /[\u0000-\u001f\u007f-\u009f‪-‮⁦-⁩]/g;
/** Strip control and bidi characters, collapse whitespace, trim. */
function sanitize(s) {
    return String(s !== null && s !== void 0 ? s : '').replace(/\s+/g, ' ').replace(UNSAFE, '').replace(/\s+/g, ' ').trim();
}
var SECRET_WORDS = '(?:key|token|secret|password|auth)';
var FLAG_SECRET = new RegExp("(--[A-Za-z0-9-]*".concat(SECRET_WORDS, "[A-Za-z0-9-]*)(?:\\s+|=)(\\S+)"), 'gi');
var ASSIGN_SECRET = new RegExp("\\b([A-Za-z0-9_]*".concat(SECRET_WORDS, "[A-Za-z0-9_]*)=(\"[^\"]*\"|'[^']*'|\\S*)"), 'gi');
var LONG_RUN = /[A-Za-z0-9_\-+/=]{24,}/g;
/** Replace likely secrets (named assignments, flags, long opaque runs) with an ellipsis. */
function scrubSecrets(s) {
    return String(s !== null && s !== void 0 ? s : '')
        .replace(FLAG_SECRET, '$1=…')
        .replace(ASSIGN_SECRET, '$1=…')
        .replace(LONG_RUN, function (run) { return (/[A-Za-z]/.test(run) && /[0-9]/.test(run) ? '…' : run); });
}
var HOME = /(?:\/Users|\/home)\/[^/\s'"]+(?=\/|\s|$)|C:\\Users\\[^\\\s'"]+/g;
/** Home directories written as `~`: shorter, and a summary never shows whose machine it ran on. */
function tildeHome(s) {
    return String(s !== null && s !== void 0 ? s : '').replace(HOME, '~');
}
/** At most n characters, a clipped string ending in '…'. */
function clip(s, n) {
    if (n <= 0)
        return '';
    return s.length <= n ? s : s.slice(0, n - 1) + '…';
}
function xmlEscape(s) {
    return String(s !== null && s !== void 0 ? s : '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
function fmtDuration(ms) {
    if (!Number.isFinite(ms) || ms < 0)
        return '0s';
    if (ms < 10000)
        return "".concat((ms / 1000).toFixed(1), "s");
    if (ms < 60000)
        return "".concat(Math.floor(ms / 1000), "s");
    var total = Math.floor(ms / 1000);
    if (ms < 3600000)
        return "".concat(Math.floor(total / 60), ":").concat(String(total % 60).padStart(2, '0'));
    var m = Math.floor((total % 3600) / 60);
    return "".concat(Math.floor(total / 3600), "h ").concat(String(m).padStart(2, '0'), "m");
}
function fmtTokens(n) {
    if (!Number.isFinite(n) || n < 0)
        return '0';
    if (n < 1000)
        return String(Math.round(n));
    var k = Math.round(n / 100) / 10;
    if (n < 1e6 && k < 1000)
        return "".concat(String(k), "k");
    return "".concat(String(Math.round(n / 1e5) / 10), "M");
}
/** A lane's display name; ids (the key, a run id) never appear in it. */
function label(meta, key) {
    if (key === 'main')
        return 'main';
    var pick = [meta === null || meta === void 0 ? void 0 : meta.name, meta === null || meta === void 0 ? void 0 : meta.description, (meta === null || meta === void 0 ? void 0 : meta.type) ? "".concat(meta.type, " agent") : undefined];
    for (var _i = 0, pick_1 = pick; _i < pick_1.length; _i++) {
        var c = pick_1[_i];
        var t = clip(sanitize(c !== null && c !== void 0 ? c : ''), 48);
        if (t && !(key.length >= 4 && t.includes(key)))
            return t;
    }
    return 'agent';
}
