import { expect, mock, test } from 'claude-code/testing'

const NOW = 1_800_000_000_000
const AGENT = 'agent-LEAKCHECK-1'
const NESTED = 'agent-LEAKCHECK-2'
const TOOL_USE = 'toolu_LEAK'
const PANE_PROPS = { title: 'Agents', isFocused: false, bodyColumns: 100, placement: 'dock', scroll: { top: 0, bodyRows: 40 }, view: {} }
const BAND_PROPS = { hasSurvey: false, isWorking: true, maxRows: 6, bodyColumns: 100, scroll: { top: 0, bodyRows: 6 }, view: {} }
const ROW_PROPS = { tool_use_id: TOOL_USE, tool: 'Agent', input: { description: 'find auth code', subagent_type: 'Explore', prompt: 'x' }, isRunning: true, isErrored: false, isInterrupted: false }

function spawnInput(over: Record<string, unknown>) {
  return {
    tool_use_id: TOOL_USE, prompt: 'Find the auth code', description: 'find auth code', subagentType: 'Explore',
    provider: { plugin: 'engine', tier: 'core' }, parentModel: 'claude-opus-5-5', background: true, fork: false, ...over,
  }
}

/** Raises a session of one Explore agent with one nested agent, as the engine would. */
async function seed($: any, on: any) {
  const clock = mock.clock(on, { now: NOW } as never)
  let next = 1
  on('agent.spawn', async () => ({ model: 'claude-sonnet-5-5', agentId: next++ === 1 ? AGENT : NESTED }))
  on('tool.call', async (_$: unknown, e: { tool: string }) => ({ result: e.tool === 'Agent' ? { status: 'async_launched', agentId: AGENT } : { ok: true } }))
  on('turn.complete', async () => ({ text: '' }))
  on('agent.list', async () => ({ value: [] }))
  on('ui.open', async () => ({ value: { isPlaced: true } }))
  on('session.usage', async () => ({ value: { cost: { usd: 1.25 } } }))
  on('session.messages', async () => ({ value: [
    { role: 'user', text: 'Find the auth code', toolUses: [] },
    { role: 'assistant', text: 'Looking at **session.ts** now.', toolUses: [{ tool_use_id: 'toolu_x', tool: 'Read', input: { file_path: '/repo/src/auth/session.ts' } }] },
  ] }))
  on('ui.render', async ($r: any, e: any) => { const { Box } = $r.ui.resolve(e); return <Box key="engine-own" /> })
  await $.agent.spawn(spawnInput({}) as never)
  await $.tool.call({ tool: 'Read', tool_use_id: 'toolu_r1', file_path: '/repo/src/auth/session.ts', agentId: AGENT } as never)
  await $.tool.call({ tool: 'Grep', tool_use_id: 'toolu_g1', pattern: 'login', agentId: AGENT } as never)
  await $.agent.spawn(spawnInput({ tool_use_id: 'toolu_nested', description: 'check tests', parentAgentId: AGENT }) as never)
  await clock.advance(450)
  return clock
}

function noIds(text: string) {
  expect(text).not.toContain('LEAKCHECK')
  expect(text).not.toContain('toolu_')
  expect(text).not.toContain('wf_')
}

async function allText(ui: { findAll: (q: object) => Promise<{ type: string; text: string; props: Record<string, unknown> }[]> }) {
  const els = await ui.findAll({})
  return els.map(el => `${el.text} ${el.type === 'Svg' ? `${String(el.props.source)} ${String(el.props.alt)}` : ''}`).join('\n')
}

for (const surface of ['terminal', 'desktop'] as const) {
  test(`the pane is a tree of agents that expand, fold and show a transcript (${surface})`, async ($, on) => {
    await seed($, on)
    const ui = await $.ui.mount({ plugin: 'subagents-plus', surface, component: 'Pane', requestId: 'subagents', props: PANE_PROPS as never })
    // Rows (no main-loop events in this session): 1 the Explore agent, 2 the agent it spawned.
    expect(await ui.find({ key: 'row-1' })).toBeDefined()
    expect(await ui.find({ key: 'row-2' })).toBeDefined()
    expect(await ui.find({ text: /└─/ })).toBeDefined()
    expect(await ui.find({ text: /1 live|2 live/ })).toBeDefined()
    noIds(await allText(ui))

    await ui.press({ key: 'row-1' })
    expect(await ui.find({ text: /Recent calls/ })).toBeDefined()
    expect(await ui.find({ text: /session\.ts/ })).toBeDefined()
    // Another agent opens while the first stays open.
    await ui.press({ key: 'row-2' })
    expect(await ui.find({ text: /from find auth code/ })).toBeDefined()
    expect(await ui.find({ key: 'act-1' })).toBeDefined()

    await ui.press({ key: 'tx-1' })
    expect(await ui.find({ text: /Task: Find the auth code/ })).toBeDefined()
    noIds(await allText(ui))
    await ui.press({ key: 'act-1' })
    expect(await ui.find({ text: /Task: Find the auth code/ })).toBeUndefined()

    await ui.press({ key: 'fold-1' })
    expect(await ui.find({ key: 'row-2' })).toBeUndefined()
    expect(await ui.find({ text: /▸1/ })).toBeDefined()

    await ui.press({ key: 'tab-timeline' })
    if (surface === 'desktop') {
      const svg = await ui.find({ type: 'Svg' })
      expect(String((await ui.findAll({ type: 'Svg' })).map(el => el.props.alt).join('|'))).toMatch(/Timeline/)
      expect(svg?.props.isInteractive).toBeUndefined()
    } else expect(await ui.find({ type: 'Raster' })).toBeDefined()
    await ui.press({ key: 'tl-2' })
    expect(await ui.find({ key: 'row-2' })).toBeDefined()
  })

  test(`the band shows live agents, yields to a survey and keeps the band beneath (${surface})`, async ($, on) => {
    await seed($, on)
    const ui = await $.ui.mount({ plugin: 'subagents-plus', surface, component: 'AbovePrompt', requestId: 'band', props: BAND_PROPS as never })
    expect(await ui.find({ text: /2 agents/ })).toBeDefined()
    expect(await ui.find({ key: 'engine-own' })).toBeDefined()
    noIds(await allText(ui))
    const survey = await $.ui.mount({ plugin: 'subagents-plus', surface, component: 'AbovePrompt', requestId: 'band2', props: { ...BAND_PROPS, hasSurvey: true } as never })
    expect(await survey.find({ text: /agents/ })).toBeUndefined()
  })
}

test('the Agent row card draws for a known call and leaves an unknown finished row alone', async ($, on) => {
  await seed($, on)
  const ui = await $.ui.mount({ plugin: 'subagents-plus', surface: 'desktop', component: 'ToolUse', requestId: TOOL_USE, props: ROW_PROPS as never })
  expect(await ui.find({ text: /Explore/ })).toBeDefined()
  expect(await ui.find({ text: /2 tools/ })).toBeDefined()
  expect(await ui.find({ key: 'engine-own' })).toBeDefined()
  noIds(await allText(ui))
  const other = await $.ui.mount({ plugin: 'subagents-plus', surface: 'desktop', component: 'ToolUse', requestId: 'toolu_other', props: { ...ROW_PROPS, tool_use_id: 'toolu_other', isRunning: false } as never })
  expect(await other.find({ text: /Explore/ })).toBeUndefined()
  expect(await other.find({ key: 'engine-own' })).toBeDefined()
  const term = await $.ui.mount({ plugin: 'subagents-plus', surface: 'terminal', component: 'ToolUse', requestId: TOOL_USE, props: ROW_PROPS as never })
  expect(await term.find({ text: /Explore/ })).toBeUndefined()
})

test('a finished agent settles: tokens counted once, status done', async ($, on) => {
  const clock = await seed($, on)
  const usage = { input_tokens: 1000, output_tokens: 200, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, model: 'claude-sonnet-5-5' }
  await $.turn.complete({ answer: 'Found it in session.ts', durationMs: 4000, isAborted: false, turnId: 't1', agentId: AGENT, usage, reason: 'answer' } as never)
  await $.turn.complete({ answer: 'Found it in session.ts', durationMs: 4000, isAborted: false, turnId: 't1', agentId: AGENT, usage, reason: 'answer' } as never)
  await clock.advance(450)
  const ui = await $.ui.mount({ plugin: 'subagents-plus', surface: 'desktop', component: 'Pane', requestId: 'subagents', props: PANE_PROPS as never })
  await ui.press({ key: 'row-1' })
  expect(await ui.find({ text: /1\.2k tokens/ })).toBeDefined()
  expect(await ui.find({ text: /done/ })).toBeDefined()
})

test('options turn the band and the cards off', { options: { band: false, inlineCards: 'off' } }, async ($, on) => {
  await seed($, on)
  const band = await $.ui.mount({ plugin: 'subagents-plus', surface: 'desktop', component: 'AbovePrompt', requestId: 'band', props: BAND_PROPS as never })
  expect(await band.find({ text: /agents/ })).toBeUndefined()
  const row = await $.ui.mount({ plugin: 'subagents-plus', surface: 'desktop', component: 'ToolUse', requestId: TOOL_USE, props: ROW_PROPS as never })
  expect(await row.find({ text: /Explore/ })).toBeUndefined()
})

const SCRIPT = `export const meta = { name: 'probe', description: 'x', phases: [ { title: 'Scan' }, { title: 'Summarize' } ] }`
const META: Record<string, string> = { 'agent-wfa.meta.json': '{"workflowPhase":"Scan"}', 'agent-wfb.meta.json': '{"workflowPhase":"Scan"}', 'agent-wfc.meta.json': '{"workflowPhase":"Summarize"}' }

async function seedWorkflow($: any, on: any, opts: { remote?: boolean } = {}) {
  const clock = mock.clock(on, { now: NOW } as never)
  const ids = ['wfa', 'wfb', 'wfc']
  on('agent.spawn', async () => ({ model: 'claude-haiku-5-5', agentId: ids.shift() }))
  on('tool.call', async (_$: unknown, e: { tool: string }) => ({
    result: e.tool === 'Workflow'
      ? opts.remote
        ? { status: 'remote_launched', taskId: 'task-r', workflowName: 'cloud-audit', sessionUrl: 'https://claude.ai/code/session_demo' }
        : { status: 'async_launched', taskId: 'task-9', runId: 'wf_run1', workflowName: 'probe', transcriptDir: '/runs/wf_run1', scriptPath: '/runs/probe.js' }
      : { ok: true },
  }))
  on('fs.read', async (_$: unknown, e: { path: string }) => {
    if (e.path === '/runs/probe.js') return { value: SCRIPT }
    const f = e.path.split('/').pop() ?? ''
    if (META[f]) return { value: META[f] }
    throw new Error('missing')
  })
  on('agent.list', async () => ({ value: [] }))
  on('ui.open', async () => ({ value: { isPlaced: true } }))
  on('session.usage', async () => ({ value: { cost: { usd: 0.5 } } }))
  on('session.messages', async () => ({ value: [] }))
  on('ui.render', async ($r: any, e: any) => { const { Box } = $r.ui.resolve(e); return <Box key="engine-own" /> })
  await $.tool.call({ tool: 'Workflow', tool_use_id: 'toolu_WF', script: SCRIPT } as never)
  if (!opts.remote) {
    for (const [i, label] of ['Map the reducer', 'Map the views', 'Summarize the flow'].entries()) {
      await $.agent.spawn(spawnInput({ tool_use_id: 'toolu_WF', description: label, subagentType: 'workflow-subagent', workflow: { runId: 'wf_run1', agentIndex: i + 1 } }) as never)
    }
    await $.tool.call({ tool: 'Read', tool_use_id: 'toolu_x1', file_path: '/repo/model.ts', agentId: 'wfa' } as never)
  }
  await clock.advance(450)
  // A reconcile pass reads each agent's phase.
  await clock.advance(2100)
  return clock
}

test('a workflow run is a row with its phases, agents under them, and ends on its notification', async ($, on) => {
  const clock = await seedWorkflow($, on)
  const ui = await $.ui.mount({ plugin: 'subagents-plus', surface: 'desktop', component: 'Pane', requestId: 'subagents', props: PANE_PROPS as never })
  expect(await ui.find({ text: /◇ probe/ })).toBeDefined()
  expect(await ui.find({ text: /workflow · running/ })).toBeDefined()
  expect(await ui.find({ text: /^Scan$/ })).toBeDefined()
  expect(await ui.find({ text: /^Summarize$/ })).toBeDefined()
  expect(await ui.find({ text: /Map the reducer/ })).toBeDefined()
  noIds(await allText(ui))
  // Folding the run hides its agents.
  await ui.press({ key: 'foldrun-1' })
  expect(await ui.find({ text: /Map the reducer/ })).toBeUndefined()
  await ui.press({ key: 'foldrun-1' })
  // The engine's end-of-run notification ends the run.
  await $.session.append({
    message: { type: 'user', content: [{ type: 'text', text: '<task-notification>\n<task-id>task-9</task-id>\n<tool-use-id>toolu_WF</tool-use-id>\n<status>completed</status>\n<usage><agent_count>3</agent_count><subagent_tokens>1000</subagent_tokens><duration_ms>26000</duration_ms></usage>\n</task-notification>' }] },
    origin: { kind: 'task-notification' }, door: 'delivery', uuid: 'n1',
  } as never)
  await clock.advance(450)
  expect(await ui.find({ text: /workflow · done/ })).toBeDefined()
  // The timeline draws the run as a band with its phases.
  await ui.press({ key: 'tab-timeline' })
  const svg = (await ui.findAll({ type: 'Svg' })).map(el => String(el.props.source)).join('')
  expect(svg).toContain('◇ probe')
  expect(svg).toContain('<title>Scan</title>')
})

test('the Workflow row gets a run card on the desktop, and a remote run links its session', async ($, on) => {
  await seedWorkflow($, on)
  const row = { tool_use_id: 'toolu_WF', tool: 'Workflow', input: { script: 'x' }, isRunning: true, isErrored: false, isInterrupted: false }
  const card = await $.ui.mount({ plugin: 'subagents-plus', surface: 'desktop', component: 'ToolUse', requestId: 'toolu_WF', props: row as never })
  expect(await card.find({ text: /◇ probe/ })).toBeDefined()
  expect(await card.find({ text: /Scan/ })).toBeDefined()
  expect(await card.find({ key: 'engine-own' })).toBeDefined()
  noIds(await allText(card))
})

test('a remote workflow run shows as remote with a link to its session', async ($, on) => {
  await seedWorkflow($, on, { remote: true })
  const ui = await $.ui.mount({ plugin: 'subagents-plus', surface: 'desktop', component: 'Pane', requestId: 'subagents', props: PANE_PROPS as never })
  expect(await ui.find({ text: /◇ cloud-audit/ })).toBeDefined()
  expect(await ui.find({ text: /workflow · remote/ })).toBeDefined()
  expect(String((await ui.find({ type: 'Link' }))?.props.href)).toBe('https://claude.ai/code/session_demo')
})
