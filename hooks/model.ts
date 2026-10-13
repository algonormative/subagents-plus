// The reducer: events in, lanes and a session summary out. Pure: inputs are
// never mutated, nothing here touches `$`. register.tsx owns the plumbing
// (planBatch -> reduceLane per lane -> reduceSession) and the state families.

import type { Digest, Kind, Lane, LaneMeta, LaneStatus, LaneTokens, Rollup, Session, Span, Usage } from '../types'
import type { Ev } from './events'
import { clip, label } from './format'

export const CAPS = {
  spans: 300,
  rollupChunk: 10,
  rollups: 200,
  steps: 200,
  lanes: 150,
  answer: 4000,
  turnsDone: 64,
  lostAfterMs: 30_000,
  quietAfterMs: 600_000,
  hiddenGcMs: 60_000,
}

const PALETTE = 7

export function isLive(status: LaneStatus): boolean {
  return status === 'running' || status === 'waiting' || status === 'pending'
}

export function isTerminal(status: LaneStatus): boolean {
  return status === 'completed' || status === 'failed' || status === 'killed' || status === 'lost'
}

// ---- tokens -------------------------------------------------------------

const zeroUsage = (): Usage => ({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0 })

export function usageTotal(u: Usage): number {
  return u.input + u.output + u.cacheRead + u.cacheWrite
}

export function addUsage(a: Usage, b: Usage): Usage {
  return {
    input: a.input + b.input,
    output: a.output + b.output,
    cacheRead: a.cacheRead + b.cacheRead,
    cacheWrite: a.cacheWrite + b.cacheWrite,
  }
}

/**
 * Tokens the lane paid for fresh (input, output, cache writes): committed
 * turns plus requests of turns still running; the foreground fallback only
 * when nothing is recorded. Cache reads are counted apart (cachedTokens):
 * summed over every request they dwarf the rest.
 */
export function totalTokens(t: LaneTokens): number {
  let sum = usageTotal(t.committed) - t.committed.cacheRead
  let any = usageTotal(t.committed) > 0
  for (const u of Object.values(t.provisional)) {
    sum += usageTotal(u) - u.cacheRead
    any ||= usageTotal(u) > 0
  }
  return any ? sum : (t.fallback ?? 0)
}

/** Input tokens the prompt cache served, over the same requests as totalTokens. */
export function cachedTokens(t: LaneTokens): number {
  let sum = t.committed.cacheRead
  for (const u of Object.values(t.provisional)) sum += u.cacheRead
  return sum
}

// ---- constructors -------------------------------------------------------

export function emptySession(epoch: number, now: number): Session {
  return {
    v: 1,
    epoch,
    startedAt: now,
    order: [],
    digests: {},
    workflows: {},
    colorNext: 0,
    live: 0,
    done: 0,
    failed: 0,
    archived: { lanes: 0, tokens: 0, tools: 0, errors: 0 },
    totals: { tokens: 0, tools: 0, errors: 0 },
    lastEventAt: now,
  }
}

export function emptyLane(key: string, epoch: number, color: number, at: number): Lane {
  return {
    v: 1,
    key,
    epoch,
    color,
    status: key === 'main' ? 'idle' : 'pending',
    firstAt: at,
    lastAt: at,
    runs: [],
    spans: [],
    rollups: [],
    steps: [],
    counts: {},
    errors: 0,
    tools: 0,
    tokens: { committed: zeroUsage(), provisional: {}, turnsDone: [] },
  }
}

// ---- planning -----------------------------------------------------------

export type Plan = {
  byLane: Map<string, Ev[]>
  /** Lanes the session has no digest for yet, with the color each gets. */
  newLanes: Map<string, number>
  colorNext: number
  /** tool_use id -> the lane keys it started. */
  toolUse: Map<string, string[]>
  workflows: Record<string, { name?: string }>
  dropped: number
}

export function planBatch(session: Session, batch: Ev[]): Plan {
  const plan: Plan = {
    byLane: new Map(),
    newLanes: new Map(),
    colorNext: session.colorNext,
    toolUse: new Map(),
    workflows: {},
    dropped: 0,
  }
  const kept: { ev: Ev; i: number }[] = []
  batch.forEach((ev, i) => {
    if (ev.epoch === session.epoch) kept.push({ ev, i })
    else plan.dropped++
  })
  kept.sort((a, b) => a.ev.at - b.ev.at || a.i - b.i)

  const lane = (key: string): Ev[] => {
    let list = plan.byLane.get(key)
    if (!list) plan.byLane.set(key, (list = []))
    if (!session.digests[key] && !plan.newLanes.has(key)) {
      plan.newLanes.set(key, key === 'main' ? -1 : plan.colorNext++ % PALETTE)
    }
    return list
  }
  const link = (id: string, key: string) => {
    const keys = plan.toolUse.get(id) ?? []
    if (!keys.includes(key)) keys.push(key)
    plan.toolUse.set(id, keys)
  }

  for (const { ev } of kept) {
    lane(ev.lane).push(ev)
    if (ev.t === 'spawned' && ev.meta.toolUseId) link(ev.meta.toolUseId, ev.lane)
    if (ev.t === 'tool-end') {
      if (ev.child) {
        link(ev.id, ev.child)
        lane(ev.child).push({
          t: 'child-report',
          epoch: ev.epoch,
          at: ev.at,
          lane: ev.child,
          tokens: ev.childTotals?.tokens,
          launch: ev.launch,
        })
      }
      if (ev.workflow) {
        const prev = plan.workflows[ev.workflow.runId]
        const name = prev?.name ?? ev.workflow.name
        plan.workflows[ev.workflow.runId] = name ? { name } : {}
      }
    }
  }
  return plan
}

// ---- one lane -----------------------------------------------------------

const hasOpenRun = (l: Lane) => l.runs.some((r) => r.end === undefined)

function lastRunEnd(l: Lane): number | undefined {
  let end: number | undefined
  for (const r of l.runs) if (r.end !== undefined && (end === undefined || r.end > end)) end = r.end
  return end
}

/** Close everything still open at `at`; spans are marked only when the turn was cut short. */
function closeAll(l: Lane, at: number, interrupted = false, turnId?: string) {
  for (const s of l.spans) {
    if (s.end !== undefined) continue
    s.end = Math.max(at, s.start)
    if (interrupted) s.isInterrupted = true
  }
  for (const s of l.steps) if (s.end === undefined && (turnId === undefined || s.turnId === turnId)) s.end = Math.max(at, s.start)
  for (const r of l.runs) if (r.end === undefined) r.end = Math.max(at, r.start)
}

/** An activity event: wake a dormant lane, make sure a live one has an open run. */
function touch(l: Lane, at: number, force = false) {
  if (isTerminal(l.status) || l.status === 'idle') {
    const since = l.endedAt ?? lastRunEnd(l)
    if (force || since === undefined || at > since) {
      l.status = 'running'
      delete l.endedAt
    }
  } else if (l.status === 'pending') {
    l.status = 'running'
  }
  delete l.quiet
  delete l.missingSince
  if (!isTerminal(l.status) && l.status !== 'idle' && !hasOpenRun(l)) l.runs.push({ start: at })
}

function count(l: Lane, kind: Kind, isError: boolean) {
  l.counts[kind] = (l.counts[kind] ?? 0) + 1
  l.tools++
  if (isError) l.errors++
}

function findSpan(l: Lane, id: string): Span | undefined {
  for (let i = l.spans.length - 1; i >= 0; i--) if (l.spans[i]!.id === id) return l.spans[i]
  return undefined
}

function insertSpan(l: Lane, span: Span) {
  let i = l.spans.length
  while (i > 0 && l.spans[i - 1]!.start > span.start) i--
  l.spans.splice(i, 0, span)
}

function mergeRollups(a: Rollup, b: Rollup): Rollup {
  const counts: Rollup['counts'] = { ...a.counts }
  for (const [k, n] of Object.entries(b.counts)) counts[k as Kind] = (counts[k as Kind] ?? 0) + (n ?? 0)
  return { start: Math.min(a.start, b.start), end: Math.max(a.end, b.end), counts, errors: a.errors + b.errors }
}

function applyCaps(l: Lane) {
  while (l.spans.length > CAPS.spans) {
    const take: number[] = []
    for (let i = 0; i < l.spans.length && take.length < CAPS.rollupChunk; i++) {
      if (l.spans[i]!.end !== undefined) take.push(i)
    }
    if (!take.length) break
    const chunk = take.map((i) => l.spans[i]!)
    const roll: Rollup = { start: Infinity, end: -Infinity, counts: {}, errors: 0 }
    for (const s of chunk) {
      roll.start = Math.min(roll.start, s.start)
      roll.end = Math.max(roll.end, s.end ?? s.start)
      roll.counts[s.kind] = (roll.counts[s.kind] ?? 0) + 1
      if (s.isError) roll.errors++
    }
    const gone = new Set(take)
    l.spans = l.spans.filter((_, i) => !gone.has(i))
    l.rollups.push(roll)
  }
  while (l.rollups.length > CAPS.rollups) {
    const pairs = Math.min(l.rollups.length - CAPS.rollups, Math.floor(l.rollups.length / 2))
    const merged: Rollup[] = []
    for (let i = 0; i < pairs; i++) merged.push(mergeRollups(l.rollups[2 * i]!, l.rollups[2 * i + 1]!))
    l.rollups = merged.concat(l.rollups.slice(pairs * 2))
  }
  if (l.steps.length > CAPS.steps) {
    let excess = l.steps.length - CAPS.steps
    l.steps = l.steps.filter((s) => {
      if (excess > 0 && s.end !== undefined) {
        excess--
        return false
      }
      return true
    })
  }
}

function setList(l: Lane, status: Exclude<LaneStatus, 'lost' | 'remote'>) {
  if (status === 'completed' || status === 'failed' || status === 'killed') {
    if (!isTerminal(l.status) || l.status === 'lost') {
      l.status = status
      l.endedAt = l.lastAt
      delete l.quiet
      closeAll(l, l.endedAt)
    }
    return
  }
  // The list lags: it never reopens a finished lane or demotes a running one to pending.
  // ...except `lost`, our own guess, which the list may contradict.
  if ((isTerminal(l.status) && l.status !== 'lost') || l.status === 'remote') return
  if (l.status === 'lost') delete l.endedAt
  if (status === 'pending' && l.status !== 'pending') return
  l.status = status
}

function apply(l: Lane, ev: Ev, now: number) {
  switch (ev.t) {
    case 'spawned': {
      const meta: Record<string, unknown> = { ...(l.meta ?? {}) }
      for (const [k, v] of Object.entries(ev.meta)) if (v !== undefined) meta[k] = v
      l.meta = meta as LaneMeta
      l.spawnedAt = ev.at
      touch(l, ev.at)
      if (l.meta.run) delete l.missingSince
      return
    }
    case 'tool-start': {
      touch(l, ev.at)
      if (findSpan(l, ev.id)) return
      insertSpan(l, { id: ev.id, kind: ev.kind, tool: ev.tool, summary: ev.summary, start: ev.at })
      count(l, ev.kind, false)
      return
    }
    case 'tool-end': {
      touch(l, ev.at)
      let span = findSpan(l, ev.id)
      if (!span) {
        span = { id: ev.id, kind: ev.kind, tool: ev.tool, summary: ev.summary, start: Math.min(ev.startedAt, ev.at) }
        insertSpan(l, span)
        count(l, ev.kind, false)
      }
      span.end = Math.max(ev.at, span.start)
      if (ev.isError && !span.isError) {
        span.isError = true
        l.errors++
      }
      if (ev.isInterrupted) span.isInterrupted = true
      if (ev.child) span.child = ev.child
      return
    }
    case 'child-report': {
      if (ev.tokens !== undefined) l.tokens.fallback = ev.tokens
      if (ev.launch === 'remote' && !isTerminal(l.status)) l.status = 'remote'
      return
    }
    case 'step-start': {
      touch(l, ev.at)
      if (!l.steps.some((s) => s.turnId === ev.turnId && s.index === ev.index)) {
        l.steps.push({ turnId: ev.turnId, index: ev.index, start: ev.at })
      }
      return
    }
    case 'step-end': {
      const step = l.steps.find((s) => s.turnId === ev.turnId && s.index === ev.index)
      if (step && step.end === undefined) step.end = Math.max(ev.at, step.start)
      if (ev.usage && !l.tokens.turnsDone.includes(ev.turnId)) {
        l.tokens.provisional[`${ev.turnId}:${ev.index}`] = ev.usage
      }
      return
    }
    case 'turn-start': {
      touch(l, ev.at, true)
      l.status = 'running'
      return
    }
    case 'say': {
      // Display only: never reopens a finished lane.
      if (isTerminal(l.status)) return
      l.live = { kind: ev.kind, text: ev.text, at: ev.at }
      return
    }
    case 'turn-complete': {
      if (l.tokens.turnsDone.includes(ev.turnId)) return
      delete l.live
      const prefix = `${ev.turnId}:`
      let sum = zeroUsage()
      for (const [k, u] of Object.entries(l.tokens.provisional)) {
        if (!k.startsWith(prefix)) continue
        sum = addUsage(sum, u)
        delete l.tokens.provisional[k]
      }
      l.tokens.committed = addUsage(l.tokens.committed, ev.usage ?? sum)
      l.tokens.turnsDone = [...l.tokens.turnsDone, ev.turnId].slice(-CAPS.turnsDone)
      closeAll(l, ev.at, ev.reason === 'aborted' || ev.reason === 'error', ev.turnId)
      if (ev.answer) l.answer = clip(ev.answer, CAPS.answer)
      if (l.key === 'main' || l.meta?.isTeammate) {
        l.status = 'idle'
      } else {
        l.status = ev.reason === 'answer' ? 'completed' : ev.reason === 'aborted' ? 'killed' : 'failed'
        l.endedAt = ev.at
      }
      return
    }
    case 'listed': {
      l.listed = true
      delete l.missingSince
      if (ev.adopt && !l.meta) l.meta = ev.adopt
      if (ev.status !== 'lost' && ev.status !== 'remote') setList(l, ev.status)
      return
    }
    case 'unlisted': {
      if (l.meta?.run || l.meta?.isFork) {
        if (!isTerminal(l.status) && now - l.lastAt > CAPS.quietAfterMs) l.quiet = true
        return
      }
      l.missingSince = l.missingSince ?? ev.at
      if (!isTerminal(l.status) && l.status !== 'remote' && ev.at - l.missingSince >= CAPS.lostAfterMs) {
        l.status = 'lost'
        l.endedAt = l.lastAt
        closeAll(l, l.lastAt)
      }
      return
    }
  }
}

export function reduceLane(
  lane: Lane | null,
  events: Ev[],
  ctx: { key: string; epoch: number; color: number; now: number },
): Lane {
  const first = events.length ? Math.min(...events.map((e) => e.at)) : ctx.now
  const l: Lane = lane ? (JSON.parse(JSON.stringify(lane)) as Lane) : emptyLane(ctx.key, ctx.epoch, ctx.color, first)
  for (const ev of events) {
    l.firstAt = Math.min(l.firstAt, ev.at)
    if (ev.t !== 'listed' && ev.t !== 'unlisted') l.lastAt = Math.max(l.lastAt, ev.at)
    apply(l, ev, ctx.now)
    applyCaps(l)
  }
  return l
}

// ---- digest, order, session ----------------------------------------------

export function digestOf(lane: Lane, depth: number): Digest {
  const meta = lane.meta
  const main = lane.key === 'main'
  let last: Span | undefined
  for (const s of lane.spans) {
    const better = !last || (s.end === undefined) > (last.end === undefined) || ((s.end === undefined) === (last.end === undefined) && s.start >= last.start)
    if (better) last = s
  }
  const d: Digest = {
    key: lane.key,
    label: label(meta, lane.key),
    type: main ? 'main' : (meta?.type ?? ''),
    status: lane.status,
    color: lane.color,
    depth,
    startedAt: lane.spawnedAt ?? lane.firstAt,
    lastAt: lane.lastAt,
    tokens: totalTokens(lane.tokens),
    cached: cachedTokens(lane.tokens),
    tools: lane.tools,
    errors: lane.errors,
    mix: { ...lane.counts },
  }
  if (meta?.model) d.model = meta.model
  if (!main && meta?.parent) d.parent = meta.parent
  if (meta?.run) d.run = meta.run
  if (lane.endedAt !== undefined) d.endedAt = lane.endedAt
  if (last) d.last = { kind: last.kind, summary: last.summary, at: last.start }
  if (lane.quiet) d.quiet = true
  if (!main && !meta) d.hidden = true
  return d
}

export function laneOrder(digests: Record<string, Digest>): { order: string[]; depth: Record<string, number> } {
  const visible = Object.values(digests).filter((d) => !d.hidden)
  const has = new Set(visible.map((d) => d.key))
  const hasMain = has.has('main')
  const kids = new Map<string, Digest[]>()
  const roots: Digest[] = []
  for (const d of visible) {
    if (d.key === 'main') continue
    const p = d.parent && d.parent !== d.key && has.has(d.parent) ? d.parent : hasMain ? 'main' : undefined
    if (p === undefined) roots.push(d)
    else kids.set(p, [...(kids.get(p) ?? []), d])
  }
  const byStart = (a: Digest, b: Digest) => a.startedAt - b.startedAt || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0)

  // Siblings of one workflow run stay together, placed where the run's first agent starts.
  const arrange = (list: Digest[]): Digest[] => {
    const runs = new Map<string, Digest[]>()
    const items: { at: number; key: string; members: Digest[] }[] = []
    for (const d of [...list].sort(byStart)) {
      if (!d.run) {
        items.push({ at: d.startedAt, key: d.key, members: [d] })
        continue
      }
      let group = runs.get(d.run)
      if (!group) {
        runs.set(d.run, (group = []))
        items.push({ at: d.startedAt, key: d.key, members: group })
      }
      group.push(d)
    }
    items.sort((a, b) => a.at - b.at || (a.key < b.key ? -1 : 1))
    return items.flatMap((i) => i.members)
  }

  const order: string[] = []
  const depth: Record<string, number> = {}
  const seen = new Set<string>()
  const walk = (d: Digest, level: number) => {
    if (seen.has(d.key)) return
    seen.add(d.key)
    order.push(d.key)
    depth[d.key] = level
    for (const c of arrange(kids.get(d.key) ?? [])) walk(c, level + 1)
  }
  const main = digests['main']
  if (main && hasMain) walk(main, 0)
  for (const r of arrange(roots)) walk(r, 0)
  // Parent cycles are unreachable from any root: show them at the top level instead of losing them.
  for (const d of [...visible].sort(byStart)) walk(d, hasMain ? 1 : 0)
  for (const d of Object.values(digests)) if (!(d.key in depth)) depth[d.key] = 0
  return { order, depth }
}

export function reduceSession(
  session: Session,
  changed: Lane[],
  plan: Plan,
  now: number,
): { session: Session; evict: string[] } {
  let digests: Record<string, Digest> = { ...session.digests }
  for (const l of changed) digests[l.key] = digestOf(l, digests[l.key]?.depth ?? 0)

  const workflows = { ...session.workflows }
  const addRun = (runId: string, name?: string) => {
    const prev = workflows[runId]
    if (prev) {
      if (!prev.name && name) workflows[runId] = { ...prev, name }
    } else {
      workflows[runId] = { ...(name ? { name } : {}), at: now, ordinal: Object.keys(workflows).length + 1 }
    }
  }
  for (const [runId, w] of Object.entries(plan.workflows)) addRun(runId, w.name)
  for (const l of changed) if (l.meta?.run) addRun(l.meta.run)

  const archived = { ...session.archived }
  const evict: string[] = []
  const drop = (key: string) => {
    const { [key]: _gone, ...rest } = digests
    digests = rest
    evict.push(key)
  }
  for (const d of Object.values(digests)) {
    if (d.hidden && (d.status === 'lost' || now - (d.lastAt ?? d.startedAt) > CAPS.hiddenGcMs)) drop(d.key)
  }
  while (Object.keys(digests).length > CAPS.lanes) {
    let oldest: Digest | undefined
    for (const d of Object.values(digests)) {
      if (d.key === 'main' || !isTerminal(d.status)) continue
      if (!oldest || (d.endedAt ?? d.lastAt ?? 0) < (oldest.endedAt ?? oldest.lastAt ?? 0)) oldest = d
    }
    if (!oldest) break
    archived.lanes++
    archived.tokens += oldest.tokens
    archived.cached = (archived.cached ?? 0) + (oldest.cached ?? 0)
    archived.tools += oldest.tools
    archived.errors += oldest.errors
    drop(oldest.key)
  }

  const { order, depth } = laneOrder(digests)
  let live = 0
  let done = 0
  let failed = 0
  const totals = { tokens: archived.tokens, cached: archived.cached ?? 0, tools: archived.tools, errors: archived.errors }
  const next: Record<string, Digest> = {}
  for (const [key, d] of Object.entries(digests)) {
    next[key] = d.depth === (depth[key] ?? 0) ? d : { ...d, depth: depth[key] ?? 0 }
    totals.tokens += d.tokens
    totals.cached += d.cached ?? 0
    totals.tools += d.tools
    totals.errors += d.errors
    if (key === 'main' || d.hidden) continue
    if (isLive(d.status) && !d.quiet) live++
    else if (d.status === 'completed') done++
    else if (d.status === 'failed' || d.status === 'killed' || d.status === 'lost') failed++
  }

  let lastEventAt = session.lastEventAt
  let firstSpawnAt = session.firstSpawnAt
  for (const l of changed) {
    lastEventAt = Math.max(lastEventAt, l.lastAt)
    if (l.spawnedAt !== undefined) firstSpawnAt = Math.min(firstSpawnAt ?? l.spawnedAt, l.spawnedAt)
  }

  const out: Session = {
    ...session,
    order,
    digests: next,
    workflows,
    colorNext: plan.colorNext,
    live,
    done,
    failed,
    archived,
    totals,
    lastEventAt,
  }
  if (firstSpawnAt !== undefined) out.firstSpawnAt = firstSpawnAt
  return { session: out, evict }
}

// ---- reconcile -----------------------------------------------------------

function mapStatus(s: string): LaneStatus {
  const x = s.toLowerCase()
  if (x.startsWith('complet') || x === 'done' || x === 'success') return 'completed'
  if (x.startsWith('fail') || x === 'error') return 'failed'
  if (x.startsWith('kill') || x.startsWith('cancel') || x.startsWith('stop')) return 'killed'
  if (x.startsWith('wait') || x.startsWith('block')) return 'waiting'
  if (x.startsWith('pend') || x.startsWith('queue')) return 'pending'
  if (x === 'idle') return 'idle'
  return 'running'
}

/** Synthetic events for one $.agent.list() pass; the reducer decides what they mean. */
export function reconcileEvents(
  session: Session,
  list: { id: string; status: string; description: string; type: string; parentId?: string; name?: string }[],
  now: number,
): Ev[] {
  const base = { epoch: session.epoch, at: now }
  const out: Ev[] = []
  const seen = new Set<string>()
  for (const item of list) {
    seen.add(item.id)
    const known = session.digests[item.id]
    const ev: Ev = { ...base, t: 'listed', lane: item.id, status: mapStatus(item.status) }
    if (!known || known.hidden) {
      ev.adopt = {
        description: item.description,
        type: item.type,
        ...(item.name ? { name: item.name } : {}),
        parent: item.parentId ?? 'main',
      }
    }
    out.push(ev)
  }
  for (const d of Object.values(session.digests)) {
    if (d.key === 'main' || seen.has(d.key) || isTerminal(d.status) || d.status === 'remote') continue
    out.push({ ...base, t: 'unlisted', lane: d.key })
  }
  return out
}
