"use strict";
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
var format_1 = require("./format");
var kinds_1 = require("./kinds");
(0, testing_1.test)('classify maps tools to kinds', function () { return __awaiter(void 0, void 0, void 0, function () {
    var _i, _a, t;
    return __generator(this, function (_b) {
        (0, testing_1.expect)((0, kinds_1.classify)('Read', {})).toBe('read');
        (0, testing_1.expect)((0, kinds_1.classify)('NotebookRead', {})).toBe('read');
        (0, testing_1.expect)((0, kinds_1.classify)('Grep', {})).toBe('search');
        (0, testing_1.expect)((0, kinds_1.classify)('Glob', {})).toBe('search');
        (0, testing_1.expect)((0, kinds_1.classify)('LSP', {})).toBe('search');
        (0, testing_1.expect)((0, kinds_1.classify)('MultiEdit', {})).toBe('edit');
        (0, testing_1.expect)((0, kinds_1.classify)('Write', {})).toBe('write');
        (0, testing_1.expect)((0, kinds_1.classify)('Monitor', {})).toBe('bash');
        (0, testing_1.expect)((0, kinds_1.classify)('WebSearch', {})).toBe('web');
        (0, testing_1.expect)((0, kinds_1.classify)('mcp__claude-in-chrome__navigate', {})).toBe('web');
        (0, testing_1.expect)((0, kinds_1.classify)('mcp__Browser__click', {})).toBe('web');
        (0, testing_1.expect)((0, kinds_1.classify)('mcp__orchard__send', {})).toBe('mcp');
        for (_i = 0, _a = ['Agent', 'Task', 'Workflow', 'SendMessage', 'TaskStop', 'TaskOutput']; _i < _a.length; _i++) {
            t = _a[_i];
            (0, testing_1.expect)((0, kinds_1.classify)(t, {})).toBe('agent');
        }
        (0, testing_1.expect)((0, kinds_1.classify)('Skill', {})).toBe('other');
        (0, testing_1.expect)((0, kinds_1.classify)(undefined, null)).toBe('other');
        return [2 /*return*/];
    });
}); });
(0, testing_1.test)('classify reads through a Bash command', function () { return __awaiter(void 0, void 0, void 0, function () {
    var bash;
    return __generator(this, function (_a) {
        bash = function (command) { return (0, kinds_1.classify)('Bash', { command: command }); };
        (0, testing_1.expect)(bash('npm test')).toBe('bash');
        (0, testing_1.expect)(bash('rg foo src')).toBe('search');
        (0, testing_1.expect)(bash('cd /x && grep -r foo .')).toBe('search');
        (0, testing_1.expect)(bash('FOO=1 BAR="a b" find . -name x')).toBe('search');
        (0, testing_1.expect)(bash('/usr/bin/ls -la')).toBe('search');
        (0, testing_1.expect)(bash('cat file.txt')).toBe('read');
        (0, testing_1.expect)(bash('tail -n 20 log')).toBe('read');
        (0, testing_1.expect)(bash("sed -n '1,5p' f")).toBe('read');
        (0, testing_1.expect)(bash('sed -i s/a/b/ f')).toBe('bash');
        (0, testing_1.expect)((0, kinds_1.classify)('Bash', null)).toBe('bash');
        (0, testing_1.expect)((0, kinds_1.classify)('Bash', { command: 5 })).toBe('bash');
        return [2 /*return*/];
    });
}); });
(0, testing_1.test)('kind tables are complete', function () { return __awaiter(void 0, void 0, void 0, function () {
    var _i, KIND_ORDER_1, k;
    return __generator(this, function (_a) {
        (0, testing_1.expect)(kinds_1.KIND_ORDER.length).toBe(9);
        for (_i = 0, KIND_ORDER_1 = kinds_1.KIND_ORDER; _i < KIND_ORDER_1.length; _i++) {
            k = KIND_ORDER_1[_i];
            (0, testing_1.expect)(typeof kinds_1.KIND_LABEL[k]).toBe('string');
        }
        (0, testing_1.expect)(kinds_1.KIND_LABEL.bash).toBe('Shell');
        return [2 /*return*/];
    });
}); });
(0, testing_1.test)('summarize per tool', function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        (0, testing_1.expect)((0, kinds_1.summarize)('Read', { file_path: '/Users/a/proj/src/index.ts' })).toBe('src/index.ts');
        (0, testing_1.expect)((0, kinds_1.summarize)('NotebookEdit', { notebook_path: '/n/books/a.ipynb' })).toBe('books/a.ipynb');
        (0, testing_1.expect)((0, kinds_1.summarize)('Grep', { pattern: 'foo', path: '/x/y/src' })).toBe('"foo" in src');
        (0, testing_1.expect)((0, kinds_1.summarize)('Grep', { pattern: 'foo' })).toBe('"foo"');
        (0, testing_1.expect)((0, kinds_1.summarize)('Glob', { pattern: '**/*.ts' })).toBe('**/*.ts');
        (0, testing_1.expect)((0, kinds_1.summarize)('Bash', { command: 'ls -la\necho hi' })).toBe('ls -la');
        (0, testing_1.expect)((0, kinds_1.summarize)('WebFetch', { url: 'https://user:pw@docs.example.com:8080/a/b?q=1' })).toBe('docs.example.com');
        (0, testing_1.expect)((0, kinds_1.summarize)('WebSearch', { query: 'bun test runner' })).toBe('bun test runner');
        (0, testing_1.expect)((0, kinds_1.summarize)('Agent', { description: 'Audit the thing' })).toBe('Audit the thing');
        (0, testing_1.expect)((0, kinds_1.summarize)('Workflow', { name: 'audit' })).toBe('audit');
        (0, testing_1.expect)((0, kinds_1.summarize)('Workflow', {})).toBe('');
        (0, testing_1.expect)((0, kinds_1.summarize)('SendMessage', { to: 'worker' })).toBe('to worker');
        (0, testing_1.expect)((0, kinds_1.summarize)('Skill', { skill: 'commit' })).toBe('commit');
        (0, testing_1.expect)((0, kinds_1.summarize)('mcp__orchard__orchard_send', {})).toBe('orchard · orchard_send');
        (0, testing_1.expect)((0, kinds_1.summarize)('Mystery', { a: 1 })).toBe('');
        return [2 /*return*/];
    });
}); });
(0, testing_1.test)('summarize clips, stays on one line and never throws', function () { return __awaiter(void 0, void 0, void 0, function () {
    var long, _i, _a, input, _b, _c, tool;
    return __generator(this, function (_d) {
        long = (0, kinds_1.summarize)('Bash', { command: 'echo ' + 'word '.repeat(40) });
        (0, testing_1.expect)(long.length).toBe(60);
        (0, testing_1.expect)(long.endsWith('…')).toBe(true);
        (0, testing_1.expect)((0, kinds_1.summarize)('Agent', { description: 'a\tb‮ c\u0007' })).toBe('a b c');
        for (_i = 0, _a = [null, undefined, 123, {}, 'str', [], { file_path: 5 }]; _i < _a.length; _i++) {
            input = _a[_i];
            for (_b = 0, _c = ['Read', 'Grep', 'Bash', 'WebFetch', 'Agent', 'SendMessage', 'mcp__x', 'Nope']; _b < _c.length; _b++) {
                tool = _c[_b];
                (0, testing_1.expect)(typeof (0, kinds_1.summarize)(tool, input)).toBe('string');
            }
        }
        return [2 /*return*/];
    });
}); });
(0, testing_1.test)('summarize scrubs secrets from commands', function () { return __awaiter(void 0, void 0, void 0, function () {
    var s;
    return __generator(this, function (_a) {
        s = (0, kinds_1.summarize)('Bash', { command: 'API_KEY=sk-abc123def456 curl --token abcdef1234567890 https://x.io' });
        (0, testing_1.expect)(s.includes('sk-abc123')).toBe(false);
        (0, testing_1.expect)(s.includes('abcdef12345')).toBe(false);
        (0, testing_1.expect)(s).toContain('API_KEY=…');
        return [2 /*return*/];
    });
}); });
(0, testing_1.test)('scrubSecrets', function () { return __awaiter(void 0, void 0, void 0, function () {
    var t;
    return __generator(this, function (_a) {
        (0, testing_1.expect)((0, format_1.scrubSecrets)('API_KEY=sk-abc123def456 run')).toBe('API_KEY=… run');
        (0, testing_1.expect)((0, format_1.scrubSecrets)('x --api-token ghp_secretvalue y')).toBe('x --api-token=… y');
        (0, testing_1.expect)((0, format_1.scrubSecrets)('PASSWORD="hunter two" ok')).toBe('PASSWORD=… ok');
        t = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0';
        (0, testing_1.expect)(t.length).toBe(40);
        (0, testing_1.expect)((0, format_1.scrubSecrets)("curl ".concat(t))).toBe('curl …');
        // Long but letters-only runs (paths, words) are kept.
        (0, testing_1.expect)((0, format_1.scrubSecrets)('abcdefghijklmnopqrstuvwxyzabcdef')).toBe('abcdefghijklmnopqrstuvwxyzabcdef');
        (0, testing_1.expect)((0, format_1.scrubSecrets)('plain text 12345')).toBe('plain text 12345');
        return [2 /*return*/];
    });
}); });
(0, testing_1.test)('sanitize, clip and xmlEscape', function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        (0, testing_1.expect)((0, format_1.sanitize)('  a\n\tb  \u0000c\u009fd‮E⁧ ')).toBe('a b cdE');
        (0, testing_1.expect)((0, format_1.clip)('abcdef', 4)).toBe('abc…');
        (0, testing_1.expect)((0, format_1.clip)('abc', 4)).toBe('abc');
        (0, testing_1.expect)((0, format_1.clip)('abcdef', 1)).toBe('…');
        (0, testing_1.expect)((0, format_1.xmlEscape)("<a href=\"x\">&'</a>")).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&apos;&lt;/a&gt;');
        return [2 /*return*/];
    });
}); });
(0, testing_1.test)('fmtDuration and fmtTokens', function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        (0, testing_1.expect)((0, format_1.fmtDuration)(400)).toBe('0.4s');
        (0, testing_1.expect)((0, format_1.fmtDuration)(9800)).toBe('9.8s');
        (0, testing_1.expect)((0, format_1.fmtDuration)(42000)).toBe('42s');
        (0, testing_1.expect)((0, format_1.fmtDuration)(72000)).toBe('1:12');
        (0, testing_1.expect)((0, format_1.fmtDuration)(3840000)).toBe('1h 04m');
        (0, testing_1.expect)((0, format_1.fmtDuration)(-5)).toBe('0s');
        (0, testing_1.expect)((0, format_1.fmtDuration)(NaN)).toBe('0s');
        (0, testing_1.expect)((0, format_1.fmtTokens)(930)).toBe('930');
        (0, testing_1.expect)((0, format_1.fmtTokens)(12400)).toBe('12.4k');
        (0, testing_1.expect)((0, format_1.fmtTokens)(12000)).toBe('12k');
        (0, testing_1.expect)((0, format_1.fmtTokens)(1234567)).toBe('1.2M');
        return [2 /*return*/];
    });
}); });
(0, testing_1.test)('label never shows the key', function () { return __awaiter(void 0, void 0, void 0, function () {
    var key;
    return __generator(this, function (_a) {
        key = 'a1b2c3d4e5f6a7b8c';
        (0, testing_1.expect)((0, format_1.label)(undefined, 'main')).toBe('main');
        (0, testing_1.expect)((0, format_1.label)({ name: 'scout', description: 'd', type: 't', parent: 'main' }, key)).toBe('scout');
        (0, testing_1.expect)((0, format_1.label)({ description: 'Audit  the\nrepo', type: 't', parent: 'main' }, key)).toBe('Audit the repo');
        (0, testing_1.expect)((0, format_1.label)({ description: '', type: 'Explore', parent: 'main' }, key)).toBe('Explore agent');
        (0, testing_1.expect)((0, format_1.label)(undefined, key)).toBe('agent');
        (0, testing_1.expect)((0, format_1.label)({ description: "run ".concat(key), type: '', parent: 'main' }, key).includes(key)).toBe(false);
        (0, testing_1.expect)((0, format_1.label)({ description: 'x'.repeat(100), type: '', parent: 'main' }, key).length).toBe(48);
        return [2 /*return*/];
    });
}); });
(0, testing_1.test)('summaries show home directories as ~', function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        (0, testing_1.expect)((0, kinds_1.summarize)('Bash', { command: 'cd /Users/someone/git/app && ls -la' })).toBe('cd ~/git/app && ls -la');
        (0, testing_1.expect)((0, kinds_1.summarize)('Read', { file_path: '/home/dev/project/src/main.ts' })).toBe('src/main.ts');
        (0, testing_1.expect)((0, kinds_1.summarize)('Grep', { pattern: 'x', path: '/Users/someone/repo' })).not.toContain('someone');
        return [2 /*return*/];
    });
}); });
