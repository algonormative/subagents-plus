import { expect, test } from 'claude-code/testing'
import type { Lane, LaneMeta, Session, Usage } from '../types'
import type { Ev } from './events'
import {
  CAPS,
  emptySession,
  isLive,
  planBatch,
  reconcileEvents,
  reduceLane,
  reduceSession,
  totalTokens,
  usageTotal,
} from './model'

const EP = 1
const T0 = 1_000_000

// ---- fixtures -------------------------------------------------------------

const use = (n: number): Usage => ({ input: n, output: 0, cacheRead: 0, cacheWrite: 0 })
const meta = (description: string, extra: Partial<LaneMeta> = {}): LaneMeta => ({
  description,
  type: 'general-purpose',
  parent: 'main',
  ...extra,
})

const spawned = (lane: string, at: number, m: LaneMeta, epoch = EP): Ev => ({ t: 'spawned', epoch, at, lane, meta: m })
const toolStart = (lane: string, id: string, at: number, kind: 'read' | 'bash' = 'read'): Ev => ({
  t: 'tool-start', epoch: EP, at, lane, id, tool: 'T', kind, summary: `s-${id}`,
})
const toolEnd = (lane: string, id: string, at: number, startedAt: number, extra: Partial<Extract<Ev, { t: 'tool-end' }>> = {}): Ev => ({
  t: 'tool-end', epoch: EP, at, lane, id, tool: 'T', kind: 'read', summary: `s-${id}`, startedAt, isError: false, ...extra,
})
const stepStart = (lane: string, turnId: string, index: number, at: number): Ev => ({
  t: 'step-start', epoch: EP, at, lane, turnId, index, model: 'm',
})
const stepEnd = (lane: string, turnId: string, index: number, at: number, usage?: Usage): Ev => ({
  t: 'step-end', epoch: EP, at, lane, turnId, index, usage,
})
const complete = (lane: string, turnId: string, at: number, usage?: Usage, reason: 'answer' | 'aborted' | 'refusal' | 'error' = 'answer'): Ev => ({
  t: 'turn-complete', epoch: EP, at, lane, turnId, reason, durationMs: 0, usage, answer: reason === 'answer' ? 'done' : '',
})
const listed = (lane: string, at: number, status: Extract<Ev, { t: 'listed' }>['status']): Ev => ({ t: 'listed', epoch: EP, at, lane, status })
const unlisted = (lane: string, at: number): Ev => ({ t: 'unlisted', epoch: EP, at, lane })

/** Reduce one lane's events on their own, the way register.tsx would per lane. */
const lane = (events: Ev[], key = 'agent-0001', prior: Lane | null = null, now = T0 + 10_000_000): Lane =>
  reduceLane(prior, events, { key, epoch: EP, color: 0, now })

type World = { session: Session; lanes: Record<string, Lane>; evict: string[]; dropped: number }
const world = (epoch = EP): World => ({ session: emptySession(epoch, T0), lanes: {}, evict: [], dropped: 0 })

/** The whole pipeline: planBatch -> reduceLane per lane -> reduceSession. */
function feed(w: World, batch: Ev[], now = Math.max(T0, ...batch.map((e) => e.at)) + 1): World {
  const plan = planBatch(w.session, batch)
  const lanes = { ...w.lanes }
  const changed: Lane[] = []
  for (const [key, events] of plan.byLane) {
    const color = plan.newLanes.get(key) ?? w.session.digests[key]?.color ?? 0
    lanes[key] = reduceLane(lanes[key] ?? null, events, { key, epoch: w.session.epoch, color, now })
    changed.push(lanes[key]!)
  }
  const out = reduceSession(w.session, changed, plan, now)
  for (const key of out.evict) delete lanes[key]
  return { session: out.session, lanes, evict: out.evict, dropped: plan.dropped }
}

// ---- lifecycle ------------------------------------------------------------

test('spawn, tools, complete', async () => {
  const w = feed(world(), [
    spawned('agent-aaaa', T0 + 100, meta('Scan the repo', { toolUseId: 'tu1' })),
    toolStart('agent-aaaa', 't1', T0 + 200),
    toolEnd('agent-aaaa', 't1', T0 + 300, T0 + 200),
    toolStart('agent-aaaa', 't2', T0 + 400, 'bash'),
    toolEnd('agent-aaaa', 't2', T0 + 500, T0 + 400, { kind: 'bash', isError: true }),
    stepStart('agent-aaaa', 'T1', 0, T0 + 150),
    stepEnd('agent-aaaa', 'T1', 0, T0 + 450, use(120)),
    complete('agent-aaaa', 'T1', T0 + 1100, use(150)),
  ])
  const l = w.lanes['agent-aaaa']!
  expect(l.status).toBe('completed')
  expect(l.endedAt).toBe(T0 + 1100)
  expect(l.endedAt! - l.spawnedAt!).toBe(1000)
  expect(l.counts).toEqual({ read: 1, bash: 1 })
  expect([l.tools, l.errors]).toEqual([2, 1])
  expect(l.spans.map((s) => s.end !== undefined)).toEqual([true, true])
  expect(l.answer).toBe('done')
  const d = w.session.digests['agent-aaaa']!
  expect([d.label, d.tokens, d.status, d.last?.summary]).toEqual(['Scan the repo', 150, 'completed', 's-t2'])
  expect([w.session.live, w.session.done, w.session.failed]).toEqual([0, 1, 0])
  expect(w.session.totals).toEqual({ tokens: 150, cached: 0, tools: 2, errors: 1 })
  expect(w.session.firstSpawnAt).toBe(T0 + 100)
})

test('events for a lane before its spawn: hidden, then filled in', async () => {
  let w = feed(world(), [toolStart('agent-bbbb', 't1', T0 + 10), toolEnd('agent-bbbb', 't1', T0 + 20, T0 + 10)])
  expect(w.session.digests['agent-bbbb']!.hidden).toBe(true)
  expect(w.session.order).toEqual([])
  w = feed(w, [spawned('agent-bbbb', T0 + 30, meta('Late spawn'))])
  const d = w.session.digests['agent-bbbb']!
  expect(d.hidden).toBeUndefined()
  expect(d.label).toBe('Late spawn')
  expect(w.lanes['agent-bbbb']!.tools).toBe(1)
  expect(w.session.order).toEqual(['agent-bbbb'])
})

test('tool-end before tool-start makes one span, counted once', async () => {
  const l = lane([toolEnd('agent-0001', 't1', T0 + 50, T0 + 10), toolStart('agent-0001', 't1', T0 + 60)])
  expect(l.spans.length).toBe(1)
  expect(l.spans[0]!.start).toBe(T0 + 10)
  expect(l.spans[0]!.end).toBe(T0 + 50)
  expect([l.tools, l.counts.read]).toEqual([1, 1])
})

test('a lane that never completes ends by the list, or is lost, or goes quiet', async () => {
  const running = lane([spawned('agent-0001', T0, meta('x')), toolStart('agent-0001', 't1', T0 + 5)])
  const done = lane([listed('agent-0001', T0 + 99_000, 'completed')], 'agent-0001', running)
  expect(done.status).toBe('completed')
  expect(done.endedAt).toBe(T0 + 5)
  expect(done.spans[0]!.end).toBe(T0 + 5)
  expect(done.spans[0]!.isInterrupted).toBeUndefined()

  const once = lane([unlisted('agent-0001', T0 + 10_000)], 'agent-0001', running)
  expect(once.status).toBe('running')
  expect(once.missingSince).toBe(T0 + 10_000)
  const lost = lane([unlisted('agent-0001', T0 + 40_000)], 'agent-0001', once)
  expect(lost.status).toBe('lost')
  expect(lost.endedAt).toBe(T0 + 5)

  const wf = lane([spawned('agent-0002', T0, meta('wf', { run: 'run-xyz' })), toolStart('agent-0002', 't1', T0 + 5)], 'agent-0002')
  const early = lane([unlisted('agent-0002', T0 + 60_000)], 'agent-0002', wf, T0 + 60_000)
  expect(early.quiet).toBeUndefined()
  const quiet = lane([unlisted('agent-0002', T0 + 700_000)], 'agent-0002', wf, T0 + 700_000)
  expect(quiet.quiet).toBe(true)
  expect(quiet.status).toBe('running')
  expect(quiet.endedAt).toBeUndefined()
  expect(quiet.missingSince).toBeUndefined()
})

test('an aborted turn closes open spans as interrupted and commits provisional tokens', async () => {
  const l = lane([
    spawned('agent-0001', T0, meta('x')),
    stepStart('agent-0001', 'T1', 0, T0 + 1),
    stepEnd('agent-0001', 'T1', 0, T0 + 2, use(120)),
    toolStart('agent-0001', 't1', T0 + 3),
    complete('agent-0001', 'T1', T0 + 9, undefined, 'aborted'),
  ])
  expect(l.status).toBe('killed')
  expect(l.spans[0]!.isInterrupted).toBe(true)
  expect(l.spans[0]!.end).toBe(T0 + 9)
  expect(totalTokens(l.tokens)).toBe(120)
  expect(l.tokens.provisional).toEqual({})
  expect(l.runs.every((r) => r.end !== undefined)).toBe(true)
})

test('a main-loop error turn leaves main idle', async () => {
  const w = feed(world(), [
    { t: 'turn-start', epoch: EP, at: T0 + 1, lane: 'main', turnId: 'M1' },
    toolStart('main', 't1', T0 + 2),
    complete('main', 'M1', T0 + 9, undefined, 'error'),
  ])
  const m = w.lanes['main']!
  expect(m.status).toBe('idle')
  expect(m.endedAt).toBeUndefined()
  expect(m.spans[0]!.isInterrupted).toBe(true)
  expect(m.color).toBe(-1)
  expect([w.session.digests['main']!.status, w.session.live]).toEqual(['idle', 0])
})

test('a finished lane reopens on later activity with a second run', async () => {
  const done = lane([spawned('agent-0001', T0, meta('x')), complete('agent-0001', 'T1', T0 + 200, use(5))])
  expect(done.status).toBe('completed')
  const late = lane([toolStart('agent-0001', 'old', T0 + 150)], 'agent-0001', done)
  expect(late.status).toBe('completed')
  const again = lane([toolStart('agent-0001', 't2', T0 + 300)], 'agent-0001', done)
  expect(again.status).toBe('running')
  expect(again.endedAt).toBeUndefined()
  expect(again.runs.length).toBe(2)
  expect(again.runs[0]!.end).toBe(T0 + 200)
  expect(again.runs[1]).toEqual({ start: T0 + 300 })
  expect(done.status).toBe('completed') // the input was not mutated
})

test('remote launches are neither live nor lost', async () => {
  let w = feed(world(), [spawned('agent-rem1', T0, meta('far away'))])
  w = feed(w, [toolEnd('main', 'tu1', T0 + 5, T0, { tool: 'Agent', kind: 'agent', child: 'agent-rem1', launch: 'remote' })])
  expect(w.lanes['agent-rem1']!.status).toBe('remote')
  expect(isLive(w.session.digests['agent-rem1']!.status)).toBe(false)
  expect(w.session.live).toBe(0)
  const later = lane([unlisted('agent-rem1', T0 + 90_000), unlisted('agent-rem1', T0 + 200_000)], 'agent-rem1', w.lanes['agent-rem1']!)
  expect(later.status).toBe('remote')
})

// ---- tokens ---------------------------------------------------------------

test('tokens are never counted twice', async () => {
  let l = lane([
    spawned('agent-0001', T0, meta('x')),
    stepStart('agent-0001', 'T1', 0, T0 + 1),
    stepEnd('agent-0001', 'T1', 0, T0 + 2, use(100)),
    stepEnd('agent-0001', 'T1', 1, T0 + 3, use(200)),
  ])
  expect(totalTokens(l.tokens)).toBe(300) // provisional while running
  l = lane([complete('agent-0001', 'T1', T0 + 4, use(300))], 'agent-0001', l)
  expect(totalTokens(l.tokens)).toBe(300)
  expect(l.tokens.provisional).toEqual({})
  l = lane([complete('agent-0001', 'T1', T0 + 5, use(300)), stepEnd('agent-0001', 'T1', 2, T0 + 6, use(50))], 'agent-0001', l)
  expect(totalTokens(l.tokens)).toBe(300) // duplicate complete and a stale step are no-ops
  expect(l.tokens.turnsDone).toEqual(['T1'])

  const tm = meta('mate', { isTeammate: true })
  const mate = lane([
    spawned('agent-0002', T0, tm),
    complete('agent-0002', 'A', T0 + 10, use(300)),
    complete('agent-0002', 'B', T0 + 20, use(150)),
  ], 'agent-0002')
  expect(usageTotal(mate.tokens.committed)).toBe(450)
  expect(mate.status).toBe('idle')
  expect(mate.endedAt).toBeUndefined()
})

test('a foreground result gives a token fallback until a turn commits', async () => {
  const w = feed(world(), [
    spawned('agent-0001', T0, meta('x')),
    toolEnd('main', 'tu1', T0 + 9, T0, { tool: 'Agent', kind: 'agent', child: 'agent-0001', childTotals: { tokens: 777, tools: 3, durationMs: 9 }, launch: 'completed' }),
  ])
  expect(w.session.digests['agent-0001']!.tokens).toBe(777)
  expect(w.session.totals.tokens).toBe(777)
  const w2 = feed(w, [complete('agent-0001', 'T1', T0 + 10, use(300))])
  expect(w2.session.digests['agent-0001']!.tokens).toBe(300)
  expect(w2.session.totals.tokens).toBe(300)
})

// ---- planning and grouping --------------------------------------------------

test('planBatch drops other epochs, assigns colors and routes ids', async () => {
  const s = emptySession(2, T0)
  const plan = planBatch(s, [
    spawned('old-agent', T0, meta('old'), 1),
    spawned('agent-0002', T0 + 2, meta('b', { toolUseId: 'tu-b' })),
    spawned('agent-0001', T0 + 1, meta('a')),
    toolStart('main', 'x', T0 + 3),
    toolEnd('main', 'tu-a', T0 + 4, T0 + 3, { child: 'agent-0001', launch: 'async' }),
  ].map((e) => (e.lane === 'old-agent' ? e : { ...e, epoch: 2 })))
  expect(plan.dropped).toBe(1)
  expect(plan.byLane.has('old-agent')).toBe(false)
  expect([...plan.newLanes.entries()]).toEqual([['agent-0001', 0], ['agent-0002', 1], ['main', -1]])
  expect(plan.colorNext).toBe(2)
  expect(plan.toolUse.get('tu-b')).toEqual(['agent-0002'])
  expect(plan.toolUse.get('tu-a')).toEqual(['agent-0001'])
  const kinds = plan.byLane.get('agent-0001')!.map((e) => e.t)
  expect(kinds).toEqual(['spawned', 'child-report'])

  const many = planBatch(emptySession(EP, T0), Array.from({ length: 9 }, (_, i) => spawned(`agent-${i}`, T0 + i, meta('x'))))
  expect([...many.newLanes.values()]).toEqual([0, 1, 2, 3, 4, 5, 6, 0, 1])
})

test('workflow agents group under the run and the run gets its name', async () => {
  const w = feed(world(), [
    spawned('agent-aaaa', T0 + 100, meta('first', { run: 'run-secret-1' })),
    spawned('agent-cccc', T0 + 150, meta('loner')),
    spawned('agent-bbbb', T0 + 200, meta('second', { run: 'run-secret-1' })),
    toolEnd('main', 'wf1', T0 + 90, T0 + 80, { tool: 'Workflow', kind: 'agent', workflow: { runId: 'run-secret-1', name: 'audit' } }),
  ])
  expect(w.session.workflows['run-secret-1']).toMatchObject({ name: 'audit', ordinal: 1, status: 'running' })
  expect(w.session.order).toEqual(['main', 'agent-aaaa', 'agent-bbbb', 'agent-cccc'])
  for (const d of Object.values(w.session.digests)) expect(d.label.includes('run-secret-1')).toBe(false)
})

test('nested agents list depth first', async () => {
  const w = feed(world(), [
    { t: 'turn-start', epoch: EP, at: T0, lane: 'main', turnId: 'M1' },
    spawned('agent-c333', T0 + 30, meta('third', { parent: 'agent-b222' })),
    spawned('agent-a111', T0 + 10, meta('first')),
    spawned('agent-b222', T0 + 20, meta('second', { parent: 'agent-a111' })),
  ])
  expect(w.session.order).toEqual(['main', 'agent-a111', 'agent-b222', 'agent-c333'])
  expect(w.session.order.map((k) => w.session.digests[k]!.depth)).toEqual([0, 1, 2, 3])
})

test('reconcileEvents lists, adopts and flags the missing', async () => {
  let w = feed(world(), [
    spawned('agent-aaaa', T0, meta('known')),
    spawned('agent-done', T0, meta('finished')),
    complete('agent-done', 'T1', T0 + 1, use(1)),
    toolStart('agent-hidn', 't', T0 + 2),
    toolStart('agent-gone', 't', T0 + 2),
    spawned('agent-gone', T0 + 2, meta('vanished')),
  ])
  const evs = reconcileEvents(w.session, [
    { id: 'agent-aaaa', status: 'running', description: 'known', type: 'x' },
    { id: 'agent-hidn', status: 'running', description: 'adopted', type: 'Explore', parentId: 'agent-aaaa', name: 'scout' },
    { id: 'agent-newb', status: 'completed', description: 'fresh', type: 'x' },
  ], T0 + 50)
  const byT = (t: string) => evs.filter((e) => e.t === t).map((e) => e.lane)
  expect(byT('listed')).toEqual(['agent-aaaa', 'agent-hidn', 'agent-newb'])
  expect(byT('unlisted')).toEqual(['agent-gone'])
  const adopt = (id: string) => (evs.find((e) => e.t === 'listed' && e.lane === id) as Extract<Ev, { t: 'listed' }>).adopt
  expect(adopt('agent-aaaa')).toBeUndefined()
  expect(adopt('agent-newb')).toEqual({ description: 'fresh', type: 'x', parent: 'main' })
  w = feed(w, evs, T0 + 50)
  expect(w.session.digests['agent-hidn']!.label).toBe('scout')
  expect(w.session.digests['agent-hidn']!.parent).toBe('agent-aaaa')
  expect(w.session.digests['agent-newb']!.status).toBe('completed')
})

// ---- caps ---------------------------------------------------------------------

test('a busy lane folds spans into rollups and keeps exact counts', async () => {
  const events: Ev[] = [spawned('agent-0001', T0, meta('busy'))]
  for (let i = 0; i < 5000; i++) {
    events.push(toolStart('agent-0001', `t${i}`, T0 + 10 + i * 2), toolEnd('agent-0001', `t${i}`, T0 + 11 + i * 2, T0 + 10 + i * 2, { isError: i % 100 === 0 }))
  }
  const l = lane(events)
  expect(l.spans.length).toBeLessThanOrEqual(CAPS.spans)
  expect(l.rollups.length).toBeLessThanOrEqual(CAPS.rollups)
  expect(l.counts.read).toBe(5000)
  expect([l.tools, l.errors]).toEqual([5000, 50])
  const rolled = l.rollups.reduce((n, r) => n + (r.counts.read ?? 0), 0)
  expect(rolled + l.spans.length).toBe(5000)
  expect(l.rollups.reduce((n, r) => n + r.errors, 0) + l.spans.filter((s) => s.isError).length).toBe(50)
  const starts = l.spans.map((s) => s.start)
  expect(starts).toEqual([...starts].sort((a, b) => a - b))
})

test('past 150 lanes the oldest finished are archived and totals stay true', async () => {
  const batch: Ev[] = []
  let truth = 0
  for (let i = 0; i < 300; i++) {
    const key = `agent-${String(i).padStart(4, '0')}`
    truth += 10 + i
    batch.push(spawned(key, T0 + i, meta(`job ${i}`)), complete(key, `T${i}`, T0 + 1000 + i, use(10 + i)))
  }
  const w = feed(world(), batch)
  expect(Object.keys(w.session.digests).length).toBeLessThanOrEqual(CAPS.lanes)
  expect(w.session.archived.lanes).toBe(150)
  expect(w.evict.length).toBe(150)
  expect(w.session.totals.tokens).toBe(truth)
  expect(w.session.totals.tools).toBe(0)
  // The oldest finished went first.
  expect(w.session.digests['agent-0000']).toBeUndefined()
  expect(w.session.digests['agent-0299']).toBeDefined()
  expect(w.session.order.length).toBe(150)
})

test('a workflow run records its launch, phases, agent phases and how it ended', async () => {
  const wf = { runId: 'wf_r1', taskId: 'task-9', name: 'probe', transcriptDir: '/tmp/x', scriptPath: '/tmp/x.js' }
  let w = feed(world(), [
    toolStart('main', 'toolu_wf', T0, 'bash'),
    toolEnd('main', 'toolu_wf', T0 + 50, T0, { tool: 'Workflow', kind: 'agent', workflow: wf }),
    spawned('a1', T0 + 100, meta('Map the reducer', { run: 'wf_r1' })),
    spawned('a2', T0 + 110, meta('Summarize', { run: 'wf_r1' })),
  ])
  expect(w.session.workflows.wf_r1).toMatchObject({ name: 'probe', taskId: 'task-9', toolUseId: 'toolu_wf', status: 'running', startedAt: T0 })
  w = feed(w, [
    { t: 'run-update', epoch: EP, at: T0 + 200, lane: 'main', key: 'wf_r1', patch: { phases: ['Scan', 'Summarize'] } },
    { t: 'lane-phase', epoch: EP, at: T0 + 200, lane: 'a1', phase: 'Scan' },
  ])
  expect(w.session.workflows.wf_r1?.phases).toEqual(['Scan', 'Summarize'])
  expect(w.session.digests.a1?.phase).toBe('Scan')
  // The notification names the task, not the run.
  w = feed(w, [{ t: 'run-update', epoch: EP, at: T0 + 900, lane: 'main', taskId: 'task-9', patch: { status: 'completed', endedAt: T0 + 900, agents: 2 } }])
  expect(w.session.workflows.wf_r1).toMatchObject({ status: 'completed', endedAt: T0 + 900, agents: 2 })
  // A late launch echo never reopens an ended run, and no lane is made for run news.
  w = feed(w, [{ t: 'run-update', epoch: EP, at: T0 + 950, lane: 'main', key: 'wf_r1', patch: { status: 'running' } }])
  expect(w.session.workflows.wf_r1?.status).toBe('completed')
  // A notification for an unknown task changes nothing.
  w = feed(w, [{ t: 'run-update', epoch: EP, at: T0 + 990, lane: 'main', taskId: 'other', patch: { status: 'failed' } }])
  expect(Object.keys(w.session.workflows)).toEqual(['wf_r1'])
})

test('a remote workflow run is keyed by its task and marked remote', async () => {
  const w = feed(world(), [
    toolEnd('main', 'toolu_r', T0 + 10, T0, { tool: 'Workflow', kind: 'agent', workflow: { taskId: 'task-r', name: 'cloud', sessionUrl: 'https://claude.ai/code/session_x', remote: true } }),
  ])
  expect(w.session.workflows['task:task-r']).toMatchObject({ status: 'remote', sessionUrl: 'https://claude.ai/code/session_x' })
})
