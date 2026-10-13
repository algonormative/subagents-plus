"use strict";
// What a tool call is (for color and counting) and a one-line, safe summary of it.
Object.defineProperty(exports, "__esModule", { value: true });
exports.KIND_LABEL = exports.KIND_ORDER = void 0;
exports.classify = classify;
exports.summarize = summarize;
var format_1 = require("./format");
exports.KIND_ORDER = ['read', 'search', 'edit', 'write', 'bash', 'web', 'mcp', 'agent', 'other'];
exports.KIND_LABEL = {
    read: 'Read',
    search: 'Search',
    edit: 'Edit',
    write: 'Write',
    bash: 'Shell',
    web: 'Web',
    mcp: 'MCP',
    agent: 'Agents',
    other: 'Other',
};
var BASH_TOOLS = ['Bash', 'BashOutput', 'KillShell', 'Monitor', 'PowerShell'];
var AGENT_TOOLS = ['Agent', 'Task', 'Workflow', 'SendMessage', 'TaskStop', 'TaskOutput'];
var SEARCH_CMDS = ['rg', 'grep', 'find', 'fd', 'ls', 'tree'];
var READ_CMDS = ['cat', 'head', 'tail', 'less', 'bat', 'wc'];
function rec(input) {
    return input !== null && typeof input === 'object' ? input : {};
}
function str(v) {
    return typeof v === 'string' ? v : '';
}
/** The command's own first word, after any `cd x &&` and `VAR=value` prefixes. */
function bashRest(command) {
    var c = command.trim();
    for (var i = 0; i < 8; i++) {
        var next = c
            .replace(/^cd\s+\S+\s*(?:&&|;)\s*/, '')
            .replace(/^[A-Za-z_][A-Za-z0-9_]*=(?:"[^"]*"|'[^']*'|\S*)\s+/, '');
        if (next === c)
            break;
        c = next;
    }
    return c;
}
function classify(tool, input) {
    var _a, _b;
    var t = String(tool);
    if (t === 'Read' || t === 'NotebookRead')
        return 'read';
    if (t === 'Grep' || t === 'Glob' || t === 'LSP')
        return 'search';
    if (t === 'Edit' || t === 'MultiEdit' || t === 'NotebookEdit')
        return 'edit';
    if (t === 'Write')
        return 'write';
    if (t === 'Bash') {
        var rest = bashRest(str(rec(input).command));
        var word = (_b = ((_a = rest.split(/\s+/)[0]) !== null && _a !== void 0 ? _a : '').split('/').pop()) !== null && _b !== void 0 ? _b : '';
        if (SEARCH_CMDS.includes(word))
            return 'search';
        if (READ_CMDS.includes(word) || (word === 'sed' && /^sed\s+(?:-\S+\s+)*-[A-Za-z]*n/.test(rest)))
            return 'read';
        return 'bash';
    }
    if (BASH_TOOLS.includes(t))
        return 'bash';
    if (t === 'WebFetch' || t === 'WebSearch')
        return 'web';
    if (t.startsWith('mcp__'))
        return /browser|chrome/i.test(t) ? 'web' : 'mcp';
    if (AGENT_TOOLS.includes(t))
        return 'agent';
    return 'other';
}
function tail(path) {
    var parts = path.split(/[\\/]/).filter(Boolean);
    return parts.slice(-2).join('/');
}
function base(path) {
    var _a;
    return (_a = path.split(/[\\/]/).filter(Boolean).pop()) !== null && _a !== void 0 ? _a : '';
}
function host(url) {
    var _a;
    var m = /^[a-z][a-z0-9+.-]*:\/\/(?:[^/@?#]*@)?([^/:?#]+)/i.exec(url.trim());
    return (_a = m === null || m === void 0 ? void 0 : m[1]) !== null && _a !== void 0 ? _a : url;
}
function raw(tool, input) {
    var _a;
    var i = rec(input);
    switch (tool) {
        case 'Read':
        case 'Edit':
        case 'MultiEdit':
        case 'Write':
        case 'NotebookEdit':
        case 'NotebookRead':
            return tail(str(i.file_path) || str(i.notebook_path));
        case 'Grep': {
            var p = str(i.pattern);
            var where = base(str(i.path));
            return p ? "\"".concat(p, "\"").concat(where ? " in ".concat(where) : '') : '';
        }
        case 'Glob':
            return str(i.pattern);
        case 'Bash':
            return (_a = str(i.command).trim().split('\n')[0]) !== null && _a !== void 0 ? _a : '';
        case 'WebFetch':
            return host(str(i.url));
        case 'WebSearch':
            return str(i.query);
        case 'Agent':
        case 'Task':
            return str(i.description);
        case 'Workflow':
            return str(i.name) || str(i.description) || str(i.workflow);
        case 'SendMessage':
            // A teammate's name reads well; an agent id does not, so ids are left out.
            return /^[A-Za-z][\w-]{0,31}$/.test(str(i.to)) && !/[0-9a-f]{6}/i.test(str(i.to)) ? "to ".concat(str(i.to)) : 'message';
        case 'Skill':
            return str(i.skill) || str(i.name);
    }
    if (tool.startsWith('mcp__')) {
        var _b = tool.slice(5).split('__'), server = _b[0], rest = _b.slice(1);
        return rest.length ? "".concat(server, " \u00B7 ").concat(rest.join('__')) : (server !== null && server !== void 0 ? server : '');
    }
    return '';
}
/** Short, single-line, secret-free, at most 60 characters; never throws. */
function summarize(tool, input) {
    try {
        return (0, format_1.clip)((0, format_1.scrubSecrets)((0, format_1.tildeHome)((0, format_1.sanitize)(raw(String(tool), input)))), 60);
    }
    catch (_a) {
        return '';
    }
}
