import { expect, test } from 'claude-code/testing'
import { clip, fmtDuration, fmtTokens, label, sanitize, scrubSecrets, xmlEscape } from './format'
import { classify, KIND_LABEL, KIND_ORDER, summarize } from './kinds'

test('classify maps tools to kinds', async () => {
  expect(classify('Read', {})).toBe('read')
  expect(classify('NotebookRead', {})).toBe('read')
  expect(classify('Grep', {})).toBe('search')
  expect(classify('Glob', {})).toBe('search')
  expect(classify('LSP', {})).toBe('search')
  expect(classify('MultiEdit', {})).toBe('edit')
  expect(classify('Write', {})).toBe('write')
  expect(classify('Monitor', {})).toBe('bash')
  expect(classify('WebSearch', {})).toBe('web')
  expect(classify('mcp__claude-in-chrome__navigate', {})).toBe('web')
  expect(classify('mcp__Browser__click', {})).toBe('web')
  expect(classify('mcp__orchard__send', {})).toBe('mcp')
  for (const t of ['Agent', 'Task', 'Workflow', 'SendMessage', 'TaskStop', 'TaskOutput']) expect(classify(t, {})).toBe('agent')
  expect(classify('Skill', {})).toBe('other')
  expect(classify(undefined as never, null)).toBe('other')
})

test('classify reads through a Bash command', async () => {
  const bash = (command: string) => classify('Bash', { command })
  expect(bash('npm test')).toBe('bash')
  expect(bash('rg foo src')).toBe('search')
  expect(bash('cd /x && grep -r foo .')).toBe('search')
  expect(bash('FOO=1 BAR="a b" find . -name x')).toBe('search')
  expect(bash('/usr/bin/ls -la')).toBe('search')
  expect(bash('cat file.txt')).toBe('read')
  expect(bash('tail -n 20 log')).toBe('read')
  expect(bash("sed -n '1,5p' f")).toBe('read')
  expect(bash('sed -i s/a/b/ f')).toBe('bash')
  expect(classify('Bash', null)).toBe('bash')
  expect(classify('Bash', { command: 5 })).toBe('bash')
})

test('kind tables are complete', async () => {
  expect(KIND_ORDER.length).toBe(9)
  for (const k of KIND_ORDER) expect(typeof KIND_LABEL[k]).toBe('string')
  expect(KIND_LABEL.bash).toBe('Shell')
})

test('summarize per tool', async () => {
  expect(summarize('Read', { file_path: '/Users/a/proj/src/index.ts' })).toBe('src/index.ts')
  expect(summarize('NotebookEdit', { notebook_path: '/n/books/a.ipynb' })).toBe('books/a.ipynb')
  expect(summarize('Grep', { pattern: 'foo', path: '/x/y/src' })).toBe('"foo" in src')
  expect(summarize('Grep', { pattern: 'foo' })).toBe('"foo"')
  expect(summarize('Glob', { pattern: '**/*.ts' })).toBe('**/*.ts')
  expect(summarize('Bash', { command: 'ls -la\necho hi' })).toBe('ls -la')
  expect(summarize('WebFetch', { url: 'https://user:pw@docs.example.com:8080/a/b?q=1' })).toBe('docs.example.com')
  expect(summarize('WebSearch', { query: 'bun test runner' })).toBe('bun test runner')
  expect(summarize('Agent', { description: 'Audit the thing' })).toBe('Audit the thing')
  expect(summarize('Workflow', { name: 'audit' })).toBe('audit')
  expect(summarize('Workflow', {})).toBe('')
  expect(summarize('SendMessage', { to: 'worker' })).toBe('to worker')
  expect(summarize('Skill', { skill: 'commit' })).toBe('commit')
  expect(summarize('mcp__orchard__orchard_send', {})).toBe('orchard · orchard_send')
  expect(summarize('Mystery', { a: 1 })).toBe('')
})

test('summarize clips, stays on one line and never throws', async () => {
  const long = summarize('Bash', { command: 'echo ' + 'word '.repeat(40) })
  expect(long.length).toBe(60)
  expect(long.endsWith('…')).toBe(true)
  expect(summarize('Agent', { description: 'a\tb‮ c\u0007' })).toBe('a b c')
  for (const input of [null, undefined, 123, {}, 'str', [], { file_path: 5 }]) {
    for (const tool of ['Read', 'Grep', 'Bash', 'WebFetch', 'Agent', 'SendMessage', 'mcp__x', 'Nope']) {
      expect(typeof summarize(tool, input)).toBe('string')
    }
  }
})

test('summarize scrubs secrets from commands', async () => {
  const s = summarize('Bash', { command: 'API_KEY=sk-abc123def456 curl --token abcdef1234567890 https://x.io' })
  expect(s.includes('sk-abc123')).toBe(false)
  expect(s.includes('abcdef12345')).toBe(false)
  expect(s).toContain('API_KEY=…')
})

test('scrubSecrets', async () => {
  expect(scrubSecrets('API_KEY=sk-abc123def456 run')).toBe('API_KEY=… run')
  expect(scrubSecrets('x --api-token ghp_secretvalue y')).toBe('x --api-token=… y')
  expect(scrubSecrets('PASSWORD="hunter two" ok')).toBe('PASSWORD=… ok')
  const t = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0'
  expect(t.length).toBe(40)
  expect(scrubSecrets(`curl ${t}`)).toBe('curl …')
  // Long but letters-only runs (paths, words) are kept.
  expect(scrubSecrets('abcdefghijklmnopqrstuvwxyzabcdef')).toBe('abcdefghijklmnopqrstuvwxyzabcdef')
  expect(scrubSecrets('plain text 12345')).toBe('plain text 12345')
})

test('sanitize, clip and xmlEscape', async () => {
  expect(sanitize('  a\n\tb  \u0000c\u009fd‮E⁧ ')).toBe('a b cdE')
  expect(clip('abcdef', 4)).toBe('abc…')
  expect(clip('abc', 4)).toBe('abc')
  expect(clip('abcdef', 1)).toBe('…')
  expect(xmlEscape(`<a href="x">&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&apos;&lt;/a&gt;')
})

test('fmtDuration and fmtTokens', async () => {
  expect(fmtDuration(400)).toBe('0.4s')
  expect(fmtDuration(9800)).toBe('9.8s')
  expect(fmtDuration(42_000)).toBe('42s')
  expect(fmtDuration(72_000)).toBe('1:12')
  expect(fmtDuration(3_840_000)).toBe('1h 04m')
  expect(fmtDuration(-5)).toBe('0s')
  expect(fmtDuration(NaN)).toBe('0s')
  expect(fmtTokens(930)).toBe('930')
  expect(fmtTokens(12_400)).toBe('12.4k')
  expect(fmtTokens(12_000)).toBe('12k')
  expect(fmtTokens(1_234_567)).toBe('1.2M')
})

test('label never shows the key', async () => {
  const key = 'a1b2c3d4e5f6a7b8c'
  expect(label(undefined, 'main')).toBe('main')
  expect(label({ name: 'scout', description: 'd', type: 't', parent: 'main' }, key)).toBe('scout')
  expect(label({ description: 'Audit  the\nrepo', type: 't', parent: 'main' }, key)).toBe('Audit the repo')
  expect(label({ description: '', type: 'Explore', parent: 'main' }, key)).toBe('Explore agent')
  expect(label(undefined, key)).toBe('agent')
  expect(label({ description: `run ${key}`, type: '', parent: 'main' }, key).includes(key)).toBe(false)
  expect(label({ description: 'x'.repeat(100), type: '', parent: 'main' }, key).length).toBe(48)
})
