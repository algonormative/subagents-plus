"use strict";
// The events the hooks capture and the reducer (model.ts) folds into lanes.
// Pure: no `$`. Every event carries the epoch it was captured in (a /clear
// bumps it, and the reducer drops events of an older one) and its own time.
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAIN = void 0;
exports.usageOf = usageOf;
/** The main loop's lane key. Every other lane is keyed by its agent id. */
exports.MAIN = 'main';
/** The token counts of an API usage record, any of its fields missing as 0. */
function usageOf(u) {
    if (u === null || typeof u !== 'object')
        return undefined;
    var r = u;
    var n = function (v) { return (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0); };
    return {
        input: n(r.input_tokens),
        output: n(r.output_tokens),
        cacheRead: n(r.cache_read_input_tokens),
        cacheWrite: n(r.cache_creation_input_tokens),
    };
}
