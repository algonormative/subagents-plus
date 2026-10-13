import { expect, test } from 'claude-code/testing'

import { parseNotification, parsePhases } from './workflow'

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
