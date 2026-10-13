import { expect, test } from 'claude-code/testing'

import { parseNotification, parsePhases, parseTranscript } from './workflow'

test('phase titles come from the script meta, in order', async () => {
  const script = `export const meta = {
  name: 'probe',
  description: 'x',
  phases: [
    { title: 'Scan', detail: 'two readers [in parallel]' },
    { title: "Summarize", detail: 'one writer' },
    { title: 'It\\'s done' },
  ],
}
phase('Scan')`
  expect(parsePhases(script)).toEqual(['Scan', 'Summarize', "It's done"])
  expect(parsePhases('export const meta = { name: "x", description: "y" }')).toEqual([])
  expect(parsePhases('phases: [ { title: ')).toEqual([])
})

test('an end-of-run notification gives the task, its call, status and usage', async () => {
  const text = `<task-notification>
<task-id>w3xhx4lsn</task-id>
<tool-use-id>toolu_01RP3BXCjx6YSWMeGiCgoPow</tool-use-id>
<status>completed</status>
<summary>Dynamic workflow "Probe" completed</summary>
<usage><agent_count>3</agent_count><agents_done>3</agents_done><subagent_tokens>249131</subagent_tokens><tool_uses>8</tool_uses><duration_ms>26138</duration_ms></usage>
</task-notification>`
  expect(parseNotification(text)).toEqual({ taskId: 'w3xhx4lsn', toolUseId: 'toolu_01RP3BXCjx6YSWMeGiCgoPow', status: 'completed', agents: 3, tokens: 249131, durationMs: 26138 })
  expect(parseNotification('<task-notification><task-id>t</task-id><status>killed</status></task-notification>')?.status).toBe('killed')
  expect(parseNotification('<task-notification><task-id>t</task-id><status>error</status></task-notification>')?.status).toBe('failed')
  expect(parseNotification('just a message')).toBeUndefined()
  expect(parseNotification('<task-notification><status>completed</status></task-notification>')).toBeUndefined()
})

test('a workflow agent transcript reads as its task, then replies with their tool calls', async () => {
  const rec = (o: object) => JSON.stringify(o)
  const jsonl = [
    rec({ type: 'user', message: { role: 'user', content: '[Workflow harness — user request] The harness relays...\n  please map it' } }),
    rec({ type: 'user', message: { role: 'user', content: '[Workflow harness — computed task] The task text below was computed... The computed task text follows:\n  Read views.tsx in chunks.\n  Read-only.' } }),
    rec({ type: 'attachment' }),
    rec({ type: 'assistant', message: { role: 'assistant', content: [{ type: 'thinking', thinking: 'x' }] } }),
    rec({ type: 'assistant', message: { role: 'assistant', content: [{ type: 'tool_use', id: 't1', name: 'Read', input: { file_path: '/repo/hooks/views.tsx' } }] } }),
    rec({ type: 'user', message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't1', content: 'ok' }] } }),
    rec({ type: 'assistant', message: { role: 'assistant', content: [{ type: 'tool_use', id: 't2', name: 'Grep', input: { pattern: 'x' } }] } }),
    rec({ type: 'user', message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't2', is_error: true, content: 'no' }] } }),
    rec({ type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'Exports: a, b.' }] } }),
    'not json',
  ].join('\n')
  const msgs = parseTranscript(jsonl, (tool, input) => `${tool}:${JSON.stringify(input).length}`)
  expect(msgs.map(m => m.role)).toEqual(['user', 'assistant'])
  expect(msgs[0]!.text).toBe('Read views.tsx in chunks.\nRead-only.')
  expect(msgs[1]!.tools.map(t => t.tool)).toEqual(['Read', 'Grep'])
  expect(msgs[1]!.tools[1]!.isError).toBe(true)
  expect(msgs[1]!.text).toBe('Exports: a, b.')
  expect(JSON.stringify(msgs)).not.toContain('please map it')
})
