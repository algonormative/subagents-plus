import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, Timer } from 'claude-code'

import type { Lane, Session, UiState } from '../types'
import type { Ev } from './events'
import { MAIN, usageOf } from './events'
import { clip } from './format'
import { classify, summarize } from './kinds'
import { axisEnd, pxWidth, SVG_ELEMENT_MAX } from './layout'
import { emptySession, isLive, planBatch, reconcileEvents, reduceLane, reduceSession } from './model'
import { timelineCells, sparkCells } from './raster'
import { cardStripSvg, foldActivity, sparklineSvg } from './svg-mini'
import { buildTimelineSvg } from './svg-timeline'
import type { Actions, Kit, Picture, TranscriptRow } from './views'
import { bandTree, cardTree, paneTree, timelineRows } from './views'

// subagents-plus: hooks capture what subagents and the main loop do into a buffer; a
// 400 ms loop folds it into $.state (model.ts); the pane, the band and the
// Agent-row cards draw from that state. Nothing here calls a model.

const PANE = 'subagents'
const STATUS_TOOL = 'mcp__subagents-plus__status'
const LOOP_MS = 400
const TICK_MS = 1000
const RECONCILE_MS = 2000
const COST_MS = 10_000
const IDLE_STOP_MS = 10_000
const BAND_GRACE_MS = 10_000
const TEN_MIN = 600_000

const DEFAULT_UI: UiState = { tab: 'tree', window: 'all', userClosed: false }

const sessionRef = atom({ plugin: 'subagents-plus', key: 'session' } as const, null)
const uiRef = atom({ plugin: 'subagents-plus', key: 'ui' } as const, DEFAULT_UI)
const tickRef = atom({ plugin: 'subagents-plus', key: 'tick' } as const, 0)
const lanesRef = { plugin: 'subagents-plus', key: 'lanes' } as const
const toolUseRef = { plugin: 'subagents-plus', key: 'byToolUse' } as const

// Module variables hold only what may die with a reload: the unflushed buffer
// (reconcile repairs it), timers, memos and diagnostics.
let epoch = -1
let buffer: Ev[] = []
let loop: Timer | undefined
let flushing = false
let ticking = false
let lastTick = 0
let lastReconcile = 0
let lastCost = 0
let lastFullscreen: boolean | undefined
const axisEnds = new Map<string, number>()
/** The newest streamed text per lane, folded into the next flush as one `say` event each. */
const saying = new Map<string, { kind: 'text' | 'thinking' | 'tool'; text: string; at: number }>()
const memo = new Map<string, Picture>()
const builds = new Map<string, { shape: string; at: number; built: number }>()
const REBUILD_MS = 8_000
const diag = {
  loadedAt: 0,
  flushes: 0,
  events: 0,
  dropped: 0,
  renders: {} as Record<string, Record<string, unknown>>,
  autoOpen: undefined as unknown,
  steps: { main: 0, sub: 0 },
  errors: [] as string[],
}

type Options = { autoOpen: boolean; inlineCards: 'desktop' | 'all' | 'off'; band: boolean; streamTap: 'subagents' | 'all' | 'off'; animate: boolean; diagnostics: boolean }

function note(where: string, err: unknown) {
  const text = String(err instanceof Error ? err.message : err).replace(/\b(toolu|agent|wf)[_-][\w-]+/g, '<id>')
  diag.errors.push(`${where}: ${text.slice(0, 160)}`)
  if (diag.errors.length > 20) diag.errors.shift()
}

function push(ev: Ev) {
  buffer.push(ev)
  diag.events += 1
  // A runaway burst between flushes keeps its newest.
  if (buffer.length > 5000) buffer.splice(0, buffer.length - 5000)
}

// ---- the loop ------------------------------------------------------------------

function ensureLoop($: EngineInterface, o: Options) {
  if (loop) return
  loop = $.clock.every(LOOP_MS, () => {
    if (ticking) return
    ticking = true
    void loopTick($, o).catch(err => note('loop', err)).finally(() => { ticking = false })
  }) as unknown as Timer
}

async function loopTick($: EngineInterface, o: Options) {
  const now = await $.clock.now()
  await flush($, o, now)
  const session = await read($, sessionRef)
  if (!session) return
  const busy = session.live > 0 || (session.digests[MAIN]?.status === 'running' && session.firstSpawnAt !== undefined)
  if (session.live > 0 && now - lastTick >= TICK_MS) {
    lastTick = now
    await update($, tickRef, () => now)
  }
  if ((busy || now - session.lastEventAt < IDLE_STOP_MS) && now - lastReconcile >= RECONCILE_MS) {
    lastReconcile = now
    await reconcile($, session, now)
  }
  if (session.live > 0 && now - lastCost >= COST_MS) {
    lastCost = now
    try {
      const usage = await $.session.usage()
      const usd = (usage as { cost?: { usd?: number } }).cost?.usd
      if (typeof usd === 'number') await update($, sessionRef, s => (s ? { ...s, costUsd: usd } : s))
    } catch (err) { note('usage', err) }
  }
  if (!busy && buffer.length === 0 && now - session.lastEventAt > IDLE_STOP_MS) {
    loop?.cancel()
    loop = undefined
    // One last tick so elapsed times settle on their final values.
    await update($, tickRef, () => now)
  }
}

async function reconcile($: EngineInterface, session: Session, now: number) {
  try {
    const list = await $.agent.list()
    for (const ev of reconcileEvents(session, list, now)) push(ev)
  } catch (err) { note('reconcile', err) }
}

async function flush($: EngineInterface, o: Options, now: number) {
  if (flushing || (buffer.length === 0 && saying.size === 0)) return
  flushing = true
  try {
    for (const [lane, s] of saying) push({ t: 'say', epoch, at: s.at, lane, kind: s.kind, text: s.text })
    saying.clear()
    let session = await read($, sessionRef)
    if (!session) {
      session = emptySession(epoch < 0 ? 0 : epoch, now)
      epoch = session.epoch
    }
    // Events captured before session.start read the epoch belong to the current one.
    const batch = buffer.splice(0).map(ev => (ev.epoch < 0 ? { ...ev, epoch: session!.epoch } : ev))
    const plan = planBatch(session, batch)
    diag.dropped += plan.dropped
    const changed: Lane[] = []
    for (const [key, evs] of plan.byLane) {
      const color = plan.newLanes.get(key) ?? session.digests[key]?.color ?? 0
      const prev = (await read($, { ...lanesRef, id: key })) ?? null
      const next = reduceLane(prev, evs, { key, epoch: session.epoch, color, now })
      if (epoch >= 0 && epoch !== session.epoch) return
      await update($, { ...lanesRef, id: key }, () => next)
      changed.push(next)
    }
    for (const [id, keys] of plan.toolUse) {
      await update($, { ...toolUseRef, id: id }, prev => [...new Set([...(prev ?? []), ...keys])])
    }
    const reduced = reduceSession(session, changed, plan, now)
    const starts = batch.filter((ev): ev is Extract<Ev, { t: 'tool-start' }> => ev.t === 'tool-start' && ev.epoch === session!.epoch)
    const next: Session = { ...reduced.session, activity: foldActivity(session.activity ?? [], starts, now) }
    for (const key of reduced.evict) await update($, { ...lanesRef, id: key }, () => null)
    // A /clear that landed mid-flush wins: never write an older epoch back.
    await update($, sessionRef, cur => (cur && cur.epoch !== session!.epoch ? cur : next))
    diag.flushes += 1
    if (next.firstSpawnAt !== undefined) await maybeAutoOpen($, o, next)
  } finally {
    flushing = false
  }
}

async function maybeAutoOpen($: EngineInterface, o: Options, session: Session) {
  if (!o.autoOpen) return
  const ui = await read($, uiRef)
  if (ui.userClosed || ui.autoOpenedEpoch === session.epoch) return
  // Only where a pane would sit beside the transcript; unknown counts as yes
  // (the engine itself still holds an unasked pane back below 144 columns).
  if (lastFullscreen === false) return
  await update($, uiRef, u => ({ ...u, autoOpenedEpoch: session.epoch }))
  try {
    diag.autoOpen = await $.ui.open({ id: PANE, title: 'Agents', columns: 100 })
  } catch (err) { note('autoOpen', err) }
}

async function startSession($: EngineInterface, o: Options) {
  diag.loadedAt = await $.clock.now()
  const session = await read($, sessionRef)
  if (session) epoch = session.epoch
  else {
    epoch = 0
    await update($, sessionRef, () => emptySession(0, diag.loadedAt))
  }
  try {
    await $.command.register({
      name: 'subagents',
      description: 'Agents pane: subagents and session activity, drawn',
      argumentHint: '[open|close|clear|tree|timeline]',
      immediate: true,
    })
  } catch (err) { note('command', err) }
  if (o.diagnostics) {
    try {
      await $.tool.register({
        name: 'status',
        description: 'subagents-plus development aid: what the subagents-plus mod sees and draws (render surfaces, widths, Svg sizes and detail levels, lane and token summaries). Read-only; takes no input.',
        inputSchema: { type: 'object', properties: {} },
      })
    } catch (err) { note('tool', err) }
  }
  // Digests written before cache reads were counted apart are recomputed once from their lanes.
  if (session && Object.values(session.digests).some(d => d.cached === undefined)) {
    try {
      const lanes: Lane[] = []
      for (const key of Object.keys(session.digests)) {
        const lane = await read($, { ...lanesRef, id: key })
        if (lane) lanes.push(lane)
      }
      const redone = reduceSession(session, lanes, planBatch(session, []), diag.loadedAt).session
      await update($, sessionRef, cur => (cur && cur.epoch === redone.epoch ? { ...redone, activity: cur.activity, costUsd: cur.costUsd } : cur))
    } catch (err) { note('recount', err) }
  }
  // A reload lost the timers and anything unflushed: catch up from the engine's list.
  if (session) {
    await reconcile($, session, diag.loadedAt)
    ensureLoop($, o)
  }
}

async function clearSession($: EngineInterface) {
  const old = await read($, sessionRef)
  buffer = []
  epoch = (old?.epoch ?? 0) + 1
  const now = await $.clock.now()
  await update($, sessionRef, () => emptySession(epoch, now))
  await update($, uiRef, (u): UiState => ({ ...u, expanded: [], folded: [], transcriptOf: undefined, autoOpenedEpoch: undefined, fullAnswer: undefined }))
  axisEnds.clear()
  memo.clear()
  builds.clear()
  for (const key of Object.keys(old?.digests ?? {})) await update($, { ...lanesRef, id: key }, () => null)
}

async function statusText($: EngineInterface): Promise<string> {
  const session = await read($, sessionRef)
  const summary = session
    ? {
        epoch: session.epoch,
        lanes: Object.values(session.digests).map(d => ({ label: d.label, type: d.type, status: d.status, depth: d.depth, tools: d.tools, tokens: d.tokens, hidden: d.hidden ?? false, workflow: d.run ? (session.workflows[d.run]?.name ?? 'unnamed') : undefined })),
        totals: session.totals, live: session.live, done: session.done, failed: session.failed, archived: session.archived,
      }
    : null
  return JSON.stringify({ ...diag, buffered: buffer.length, loop: loop !== undefined, session: summary }, null, 1)
}

// ---- drawing helpers ----------------------------------------------------------------

async function lanesFor($: EngineInterface, session: Session, keys: readonly string[]): Promise<Map<string, Lane>> {
  const out = new Map<string, Lane>()
  for (const key of keys) {
    if (!session.digests[key] || session.digests[key]!.hidden) continue
    const lane = await read($, { ...lanesRef, id: key })
    if (lane) out.set(key, lane)
  }
  return out
}

function actionsFor($: EngineInterface): Actions {
  return {
    tab: tab => void update($, uiRef, u => ({ ...u, tab })),
    expand: key => void update($, uiRef, (u): UiState => ({ ...u, expanded: toggled(u.expanded, key), fullAnswer: undefined })),
    fold: key => void update($, uiRef, (u): UiState => ({ ...u, folded: toggled(u.folded, key) })),
    transcript: key => void update($, uiRef, (u): UiState => ({ ...u, transcriptOf: key })),
    toggleWindow: () => void update($, uiRef, (u): UiState => ({ ...u, window: u.window === '10m' ? 'all' : '10m' })),
    toggleAnswer: () => void update($, uiRef, u => ({ ...u, fullAnswer: !u.fullAnswer })),
    jump: key => void jumpTo($, key),
    open: key => void openPane($, key),
  }
}

async function transcriptOf($: EngineInterface, agentId: string): Promise<TranscriptRow[] | 'unreadable'> {
  try {
    const found = await $.session.messages({ agentId })
    if (!Array.isArray(found)) return 'unreadable'
    return found.slice(-60).map(m => ({
      role: m.role,
      text: m.text,
      tools: m.toolUses.map(t => ({ tool: String(t.tool), summary: summarize(String(t.tool), t.input), ...((t as { isError?: boolean }).isError ? { isError: true } : {}) })),
    }))
  } catch (err) {
    note('transcript', err)
    return 'unreadable'
  }
}

async function jumpTo($: EngineInterface, key: string) {
  const lane = await read($, { ...lanesRef, id: key })
  const id = lane?.meta?.toolUseId
  if (!id) return
  try {
    await $.ui.scroll({ to: { requestId: id } })
  } catch (err) { note('jump', err) }
}

async function openPane($: EngineInterface, key?: string) {
  // Opening an agent unfolds its ancestors, so its row is on screen.
  const session = key ? await read($, sessionRef) : null
  const ancestors = new Set<string>()
  for (let k = key ? session?.digests[key]?.parent : undefined, hops = 0; k && hops < 64; k = session?.digests[k]?.parent, hops++) ancestors.add(k)
  await update($, uiRef, (u): UiState => ({
    ...u,
    userClosed: false,
    tab: key ? 'tree' : u.tab,
    ...(key ? {
      expanded: (u.expanded ?? []).includes(key) ? u.expanded : [...(u.expanded ?? []), key],
      folded: (u.folded ?? []).filter(f => !ancestors.has(f)),
    } : {}),
  }))
  try {
    await $.ui.open({ id: PANE, title: 'Agents', columns: 100 })
  } catch (err) { note('open', err) }
}

function toggled(list: readonly string[] | undefined, key: string): string[] {
  const now = list ?? []
  return now.includes(key) ? now.filter(k => k !== key) : [...now, key].slice(-20)
}

function memoized(key: string, make: () => Picture): Picture {
  const hit = memo.get(key)
  if (hit) return hit
  const p = make()
  memo.set(key, p)
  if (memo.size > 64) memo.delete(memo.keys().next().value as string)
  return p
}

// ---- register --------------------------------------------------------------------

export const register: Register = (on, options) => {
  const o: Options = {
    autoOpen: options.autoOpen !== false,
    inlineCards: options.inlineCards === 'all' || options.inlineCards === 'off' ? options.inlineCards : 'desktop',
    band: options.band !== false,
    streamTap: options.streamTap === 'all' || options.streamTap === 'off' ? options.streamTap : 'subagents',
    animate: options.animate !== false,
    diagnostics: options.diagnostics !== false,
  }

  on('session.start', { isInteractive: [true, false] }, async ($, e, next) => {
    await startSession($, o)
    return next(e)
  }).catch(($, e, next) => next(e))

  on('session.end', { reason: 'clear' }, async ($, e, next) => {
    await clearSession($)
    return next(e)
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'subagents' }, async ($, e) => {
    const verb = e.args.trim().toLowerCase()
    if (verb === 'close') {
      await $.ui.close({ id: PANE })
      return { text: 'Agents pane closed.' }
    }
    if (verb === 'clear') {
      await clearSession($)
      return { text: 'Cleared the Agents pane; agents still running reappear as they act.' }
    }
    if (verb === 'tree' || verb === 'timeline') {
      await update($, uiRef, (u): UiState => ({ ...u, tab: verb }))
    }
    await update($, uiRef, u => ({ ...u, userClosed: false }))
    const opened = await $.ui.open({ id: PANE, title: 'Agents', columns: 100 })
    ensureLoop($, o)
    return { text: opened.isPlaced ? 'Agents pane opened.' : `The Agents pane waits for room (${opened.reason ?? 'not placed'}).` }
  }).catch(() => ({ text: 'subagents-plus: that failed, try again.' }))

  if (o.diagnostics) {
    // Cast: the laid tool table predates this mod's own tool.
    on('tool.call', { tool: STATUS_TOOL } as unknown as { tool: 'Read' }, async $ => ({ result: await statusText($) }) as never)
      .catch(() => ({ deny: 'subagents-plus status failed' }))
  }

  on('ui.close', { id: PANE }, async ($, e, next) => {
    const out = await next(e)
    if (e.origin.kind === 'person') await update($, uiRef, u => ({ ...u, userClosed: true }))
    return out
  }).catch(($, e, next) => next(e))

  // ---- capture ------------------------------------------------------------------

  on('agent.spawn', async ($, e, next) => {
    const at = await $.clock.now()
    const r = await next(e)
    if (r.agentId) {
      push({
        t: 'spawned', epoch, at, lane: r.agentId,
        meta: {
          description: e.description,
          type: e.subagentType,
          ...(e.name ? { name: e.name } : {}),
          model: r.model,
          ...(e.isTeammate ? { isTeammate: true as const } : {}),
          ...(e.fork ? { isFork: true as const } : {}),
          background: e.background,
          parent: e.parentAgentId ?? MAIN,
          ...(e.workflow ? { run: e.workflow.runId, runIndex: e.workflow.agentIndex } : {}),
          ...(e.tool_use_id && !e.workflow ? { toolUseId: e.tool_use_id } : {}),
        },
      })
      ensureLoop($, o)
    }
    return r
  }).catch(($, e, next) => next(e))

  on('tool.call', async ($, e, next) => {
    if (String(e.tool) === STATUS_TOOL) return next(e)
    const lane = e.agentId ?? MAIN
    const tool = String(e.tool)
    const kind = classify(tool, e)
    const summary = summarize(tool, e)
    const startedAt = await $.clock.now()
    push({ t: 'tool-start', epoch, at: startedAt, lane, id: e.tool_use_id, tool, kind, summary })
    ensureLoop($, o)
    const r = await next(e)
    const at = await $.clock.now()
    const result = (r as { result?: unknown }).result as Record<string, unknown> | undefined
    const ev: Extract<Ev, { t: 'tool-end' }> = {
      t: 'tool-end', epoch, at, lane, id: e.tool_use_id, tool, kind, summary, startedAt,
      isError: (r as { isError?: boolean }).isError === true || (r as { deny?: string }).deny !== undefined,
    }
    if (result && typeof result === 'object') {
      if (tool === 'Agent' || tool === 'Task') {
        const child = typeof result.agentId === 'string' ? result.agentId : typeof result.agent_id === 'string' ? result.agent_id : undefined
        if (child) ev.child = child
        const status = String(result.status ?? '')
        ev.launch = status === 'async_launched' ? 'async' : status === 'remote_launched' ? 'remote' : status === 'teammate_spawned' ? 'teammate' : status === 'completed' ? 'completed' : undefined
        if (typeof result.totalTokens === 'number') {
          ev.childTotals = { tokens: result.totalTokens, tools: Number(result.totalToolUseCount ?? 0), durationMs: Number(result.totalDurationMs ?? 0) }
        }
      } else if (tool === 'Workflow' && typeof result.runId === 'string') {
        ev.workflow = { runId: result.runId, ...(typeof result.workflowName === 'string' ? { name: clip(result.workflowName, 40) } : {}) }
      }
    }
    push(ev)
    return r
  }).catch(($, e, next) => next(e))

  on('turn.start', async ($, e, next) => {
    push({ t: 'turn-start', epoch, at: await $.clock.now(), lane: MAIN, turnId: e.turnId })
    ensureLoop($, o)
    return next(e)
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    push({
      t: 'turn-complete', epoch, at: await $.clock.now(), lane: e.agentId ?? MAIN, turnId: e.turnId,
      reason: e.reason, durationMs: e.durationMs, usage: usageOf(e.usage), answer: clip(e.answer ?? '', 4000),
    })
    ensureLoop($, o)
    return next(e)
  }).catch(($, e, next) => next(e))

  if (o.streamTap !== 'off') {
    on('turn.step', async function* ($, e, next) {
      if (e.agentId === undefined) diag.steps.main += 1
      else diag.steps.sub += 1
      if (o.streamTap === 'subagents' && e.agentId === undefined) return yield* next(e)
      const lane = e.agentId ?? MAIN
      push({ t: 'step-start', epoch, at: await $.clock.now(), lane, turnId: e.turnId, index: e.index, model: e.model })
      ensureLoop($, o)
      // Forward every chunk unchanged; keep the tail of what the model says for the live line.
      const stream = next(e)
      let r
      for (;;) {
        const step = await stream.next()
        if (step.done) { r = step.value; break }
        const c = step.value
        if (c.kind === 'text' || c.kind === 'thinking') {
          const prev = saying.get(lane)
          const text = (prev && prev.kind === c.kind ? prev.text : '') + c.text
          saying.set(lane, { kind: c.kind, text: text.slice(-240), at: Date.now() })
        } else if (c.kind === 'tool') {
          saying.set(lane, { kind: 'tool', text: c.name, at: Date.now() })
        }
        yield c
      }
      push({ t: 'step-end', epoch, at: await $.clock.now(), lane, turnId: e.turnId, index: e.index, usage: r.usage ? usageOf(r.usage) : undefined })
      return r
    })
  }

  // ---- drawing ------------------------------------------------------------------------

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const els = $.ui.resolve(e)
    const kit: Kit = {
      surface: e.surface, Box: els.Box, Text: els.Text, Button: els.Button, Markdown: els.Markdown,
      ...(e.surface !== 'terminal' && 'Svg' in els ? { Svg: els.Svg } : {}),
      ...(e.surface === 'terminal' && 'Raster' in els ? { Raster: els.Raster } : {}),
    }
    if (e.viewport?.isFullscreen !== undefined) lastFullscreen = e.viewport.isFullscreen
    const session = await read($, sessionRef)
    const ui = await read($, uiRef)
    if (!session) return <kit.Text dimColor>Waiting for the session to start…</kit.Text>
    // The pane holds no interactive frame any more, so a 1 Hz redraw (glyphs
    // turning, names breathing, elapsed times) costs no flash or lost click.
    const tick = await read($, tickRef)
    const now = Math.max(Date.now(), tick, session.lastEventAt)
    const viewKey = e.props.view.agentId
    const columns = Math.max(20, e.props.bodyColumns)
    const lanes = await lanesFor($, session, session.order)
    const t0Session = Math.min(session.startedAt, ...[...lanes.values()].map(l => l.firstAt))
    const t0 = ui.window === '10m' ? Math.max(t0Session, now - TEN_MIN) : t0Session
    // Svg rebuilt when the data changes or every 15 s; between, SMIL moves it.
    // The picture is rebuilt when the cast changes (who, nesting, status,
    // selection, width) at once, and for new tool calls at most every 8 s;
    // SMIL carries live bars and heads in between.
    const cast = session.order.map(k => `${k}:${session.digests[k]?.status}${session.digests[k]?.quiet ? 'q' : ''}`).join(',')
    const shape = `${session.epoch}|${cast}|${viewKey ?? ''}|${columns}|${o.animate}|${ui.tab}|${ui.window}`
    const prevBuild = builds.get('pane')
    const fresh = !prevBuild || prevBuild.shape !== shape || (session.lastEventAt > prevBuild.at && now - prevBuild.built >= REBUILD_MS)
    if (fresh) builds.set('pane', { shape, at: session.lastEventAt, built: now })
    const dataKey = `${shape}|${builds.get('pane')!.built}`

    let picture: Picture | undefined
    if (ui.tab === 'timeline') {
      const axisKey = `${ui.window}|${session.epoch}`
      const t1 = axisEnd(t0, now, axisEnds.get(axisKey))
      axisEnds.set(axisKey, t1)
      picture = memoized(`t|${dataKey}|${ui.window}|${t1}`, () => {
        const rows = timelineRows(session, lanes, ui, viewKey, t0)
        if (!kit.Svg) {
          const laneRows = rows.filter(r => r.t === 'lane')
          const cols = Math.max(10, Math.min(512, columns - 24))
          const packed = timelineCells(laneRows.map(r => ({ color: r.color, status: r.status, live: isLive(r.status) && !r.quiet, start: r.start, end: r.end, spans: r.spans, steps: r.steps })), { columns: cols, t0, t1, now })
          return {
            kind: 'raster', key: 'timeline', ...packed,
            labels: laneRows.map(r => ({ text: `${'  '.repeat(r.depth)}${r.label}`, color: r.color < 0 ? 'claude' : undefined, dim: !isLive(r.status) })),
          }
        }
        const width = pxWidth(columns, 2)
        const b = buildTimelineSvg(rows, { width, now, t0, t1, animate: false }, SVG_ELEMENT_MAX)
        diag.renders.timeline = { chars: b.source.length, level: b.level, rows: rows.length }
        // A still image: an interactive frame swallows the pane's scroll and clicks.
        return { kind: 'svg', source: b.source, alt: b.alt, width, height: b.height, interactive: false }
      })
    }
    const sparkline: Picture | undefined = session.activity && session.activity.length
      ? kit.Svg
        ? { kind: 'svg', source: sparklineSvg(session.activity, Math.floor(now / 5000) * 5000, 160, 16), alt: 'Tool calls over the last two minutes', width: 160, height: 16, interactive: false }
        : { kind: 'raster', key: 'spark', ...sparkCells(session.activity, now, 24) }
      : undefined
    diag.renders.Pane = { surface: e.surface, columns: e.props.bodyColumns, placement: e.props.placement, isFullscreen: e.viewport?.isFullscreen, tab: ui.tab }
    const showing = ui.transcriptOf && (ui.expanded ?? []).includes(ui.transcriptOf) ? ui.transcriptOf : undefined
    const transcript = showing ? await transcriptOf($, showing) : undefined
    return paneTree(kit, { session, ui, lanes, now, columns, viewKey, picture, sparkline, transcript }, actionsFor($))
  })

  if (o.band) {
    on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
      if (e.viewport?.isFullscreen !== undefined) lastFullscreen = e.viewport.isFullscreen
      if (e.props.hasSurvey) return next(e)
      const session = await read($, sessionRef)
      const tick = await read($, tickRef)
      if (!session || session.firstSpawnAt === undefined) return next(e)
      const now = Math.max(tick, session.lastEventAt)
      const grace = session.live === 0
      const lastEnd = Math.max(0, ...Object.values(session.digests).map(d => d.endedAt ?? 0))
      if (grace && now - lastEnd > BAND_GRACE_MS) return next(e)
      const els = $.ui.resolve(e)
      const kit: Kit = {
        surface: e.surface, Box: els.Box, Text: els.Text, Button: els.Button, Markdown: els.Markdown,
        ...(e.surface !== 'terminal' && 'Svg' in els ? { Svg: els.Svg } : {}),
        ...(e.surface === 'terminal' && 'Raster' in els ? { Raster: els.Raster } : {}),
      }
      const spark: Picture | undefined = !grace && session.activity?.length
        ? kit.Svg
          ? { kind: 'svg', source: sparklineSvg(session.activity, Math.floor(now / 5000) * 5000, 120, 14), alt: 'Tool calls over the last two minutes', width: 120, height: 14, interactive: false }
          : { kind: 'raster', key: 'band-spark', ...sparkCells(session.activity, now, 16) }
        : undefined
      diag.renders.AbovePrompt = { surface: e.surface, columns: e.props.bodyColumns, live: session.live }
      const mine = bandTree(kit, session, now, e.props.view.agentId, grace, spark, actionsFor($))
      // Another plugin's band (beads-band) still draws beneath ours.
      const beneath = await next(e)
      return <kit.Box flexDirection="column">{mine}{beneath}</kit.Box>
    })
  }

  if (o.inlineCards !== 'off') {
    on('ui.render', { component: 'ToolUse', props: { tool: 'Agent' } }, async ($, e, next) => {
      if (e.viewport?.isFullscreen !== undefined) lastFullscreen = e.viewport.isFullscreen
      if (o.inlineCards === 'desktop' && e.surface === 'terminal') return next(e)
      const keys = (await read($, { ...toolUseRef, id: e.props.tool_use_id })) ?? []
      const session = await read($, sessionRef)
      const key = keys[0]
      const d = key && session ? session.digests[key] : undefined
      if (!d && !e.props.isRunning) return next(e)
      const lane = key ? ((await read($, { ...lanesRef, id: key })) ?? undefined) : undefined
      const onScreen = e.props.onScreen !== null
      const live = d ? isLive(d.status) && !d.quiet : true
      // A card redraws with its lane, not every second (its strip is a picture).
      const now = Math.max(Date.now(), lane?.lastAt ?? 0)
      const els = $.ui.resolve(e)
      const kit: Kit = {
        surface: e.surface, Box: els.Box, Text: els.Text, Button: els.Button, Markdown: els.Markdown,
        ...(e.surface !== 'terminal' && 'Svg' in els ? { Svg: els.Svg } : {}),
      }
      const width = pxWidth(Math.min(e.viewport?.columns ?? 80, 110), 8)
      const strip: Picture | undefined = kit.Svg && lane && onScreen && lane.spans.length
        ? { kind: 'svg', source: cardStripSvg(lane.spans, { width, t0: lane.spawnedAt ?? lane.firstAt, now: lane.lastAt, end: lane.endedAt, color: lane.color, live }), alt: `${lane.tools} tool calls`, width, height: 14, interactive: false }
        : undefined
      const children = session && key ? Object.values(session.digests).filter(c => c.parent === key && !c.hidden).length : 0
      const input = e.props.input as { description?: unknown; subagent_type?: unknown } | undefined
      diag.renders.ToolUse = { surface: e.surface, known: d !== undefined, onScreen: e.props.onScreen === undefined ? 'absent' : onScreen }
      const beneath = await next(e)
      return cardTree(
        kit, d, lane,
        { description: typeof input?.description === 'string' ? input.description : undefined, subagentType: typeof input?.subagent_type === 'string' ? input.subagent_type : undefined },
        now, strip, children, actionsFor($), beneath,
      )
    })
  }
}
