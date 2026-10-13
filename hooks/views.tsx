// What the pane, the band and the inline card draw, built from state that
// register.tsx has read. Pure: no `$`; presses arrive as closures (Actions).

import type { Elements, RenderElement, RenderSurface } from 'claude-code'

import type { Digest, Kind, Lane, LaneStatus, Session, Span, UiState, Usage } from '../types'
import { clip, fmtDuration, fmtTokens } from './format'
import { KIND_LABEL, KIND_ORDER } from './kinds'
import { cachedTokens, isLive, isTerminal, totalTokens } from './model'
import { KIND_SWATCH, STATUS_SWATCH, textColor } from './palette'
import { cardStripSvg } from './svg-mini'
import type { TimelineRow } from './svg-timeline'

export type Kit = {
  surface: RenderSurface
  Box: Elements['desktop']['Box']
  Text: Elements['desktop']['Text']
  Button: Elements['desktop']['Button']
  Markdown: Elements['desktop']['Markdown']
  Svg?: Elements['desktop']['Svg']
  Raster?: Elements['terminal']['Raster']
}

export type Actions = {
  tab: (tab: UiState['tab']) => void
  /** Show or hide an agent's detail under its row. */
  expand: (key: string) => void
  /** Show or hide an agent's children. */
  fold: (key: string) => void
  /** Show this agent's transcript in its detail, or its activity again (undefined). */
  transcript: (key: string | undefined) => void
  toggleWindow: () => void
  toggleAnswer: () => void
  jump?: (key: string) => void
  open?: (key?: string) => void
}

/** A drawn picture: Svg source on a remote surface, Raster cells on the terminal. */
export type Picture =
  | { kind: 'svg'; source: string; alt: string; width: number; height: number; interactive: boolean }
  | { kind: 'raster'; key: string; cells: string; columns: number; rows: number; labels?: { text: string; color?: string; dim?: boolean }[] }
  | { kind: 'text'; lines: { text: string; color?: string; dim?: boolean }[] }

// ---- rows for the pictures ----------------------------------------------------

const KEEP_LIVE = 1

/** The visible lanes in display order, with workflow headings, ready for the timeline. */
export function timelineRows(session: Session, lanes: ReadonlyMap<string, Lane>, ui: UiState, viewKey: string | undefined, t0: number): TimelineRow[] {
  const rows: TimelineRow[] = []
  let run: string | undefined
  let recency = 0
  const byRecency = [...session.order].sort((a, b) => (session.digests[b]?.lastAt ?? 0) - (session.digests[a]?.lastAt ?? 0))
  const rank = new Map(byRecency.map((k, i) => [k, i]))
  for (const key of session.order) {
    const d = session.digests[key]
    const lane = lanes.get(key)
    if (!d || d.hidden || !lane) continue
    if (d.run !== run) {
      run = d.run
      if (run !== undefined) {
        const wf = session.workflows[run]
        rows.push({ t: 'group', label: wf?.name ? wf.name : `Workflow ${wf?.ordinal ?? ''}`.trim(), depth: Math.max(0, d.depth) })
      }
    }
    const isMain = key === 'main'
    const emphasis = viewKey === key ? 'view' : undefined
    const live = isLive(d.status) && !d.quiet
    recency = rank.get(key) ?? 999
    const spans = lane.spans.filter(s => (s.end ?? Infinity) >= t0)
    rows.push({
      t: 'lane',
      key,
      label: d.label,
      depth: d.depth,
      color: d.color,
      status: d.status,
      isMain,
      quiet: d.quiet,
      start: lane.spawnedAt ?? lane.firstAt,
      end: isTerminal(d.status) || d.status === 'remote' ? (lane.endedAt ?? lane.lastAt) : undefined,
      spawnedAt: lane.spawnedAt,
      parentKey: lane.meta?.parent,
      runs: lane.runs,
      steps: lane.steps.filter(s => (s.end ?? Infinity) >= t0),
      spans,
      rollups: lane.rollups.filter(r => r.end >= t0),
      emphasis,
      keep: isMain ? 0 : live ? KEEP_LIVE : emphasis ? 2 : 3 + recency,
    })
  }
  return rows
}

// ---- numbers -------------------------------------------------------------------

export function laneUsage(lane: Lane): Usage {
  const u: Usage = { ...lane.tokens.committed }
  for (const p of Object.values(lane.tokens.provisional)) {
    u.input += p.input
    u.output += p.output
    u.cacheRead += p.cacheRead
    u.cacheWrite += p.cacheWrite
  }
  return u
}

export function elapsed(d: Pick<Digest, 'startedAt' | 'endedAt' | 'status'>, now: number): number {
  return Math.max(0, (d.endedAt ?? now) - d.startedAt)
}

function subagents(session: Session): Digest[] {
  return session.order.map(k => session.digests[k]).filter((d): d is Digest => !!d && !d.hidden && d.key !== 'main')
}

export function statsLine(session: Session, now: number): string {
  const subs = subagents(session)
  const live = subs.filter(d => isLive(d.status) && !d.quiet).length
  const done = subs.filter(d => d.status === 'completed').length
  const failed = subs.filter(d => d.status === 'failed' || d.status === 'killed' || d.status === 'lost').length
  const parts = [`● ${live} live`, `✓ ${done} done`]
  if (failed) parts.push(`✗ ${failed}`)
  parts.push(`${session.totals.tools} tools`, `${fmtTokens(session.totals.tokens)} tok`)
  if (session.totals.cached) parts.push(`${fmtTokens(session.totals.cached)} cached`)
  if (session.firstSpawnAt !== undefined) {
    const wall = Math.max(1, now - session.firstSpawnAt)
    parts.push(fmtDuration(wall))
    const agentTime = subs.reduce((s, d) => s + elapsed(d, now), 0)
    if (agentTime > 0) parts.push(`${(agentTime / wall).toFixed(1)}× parallel`)
  }
  if (session.costUsd !== undefined) parts.push(`$${session.costUsd.toFixed(2)}`)
  return parts.join('  ·  ')
}

const STATUS_WORD: Record<LaneStatus, string> = {
  pending: 'starting', running: 'running', waiting: 'waiting', idle: 'idle', completed: 'done',
  failed: 'failed', killed: 'stopped', lost: 'lost track', remote: 'remote',
}

function statusGlyph(d: Pick<Digest, 'status' | 'quiet'>): string {
  if (d.quiet) return '⋯'
  switch (d.status) {
    case 'completed': return '✓'
    case 'failed': return '✗'
    case 'killed': return '■'
    case 'lost': return '?'
    case 'remote': return '↗'
    case 'idle': return '◦'
    default: return '●'
  }
}

const SPIN = ['◐', '◓', '◑', '◒']

/** A live agent's glyph turns once a second; an ended one shows how it ended. */
function liveGlyph(d: Pick<Digest, 'status' | 'quiet'>, now: number): string {
  return isLive(d.status) && !d.quiet ? SPIN[Math.floor(now / 1000) % SPIN.length]! : statusGlyph(d)
}

function statusColor(d: Pick<Digest, 'status'>): string | undefined {
  if (d.status === 'completed') return STATUS_SWATCH.ok.dark
  if (d.status === 'failed') return STATUS_SWATCH.error.dark
  return undefined
}

// ---- pane ------------------------------------------------------------------------

export type PaneInput = {
  session: Session
  ui: UiState
  lanes: ReadonlyMap<string, Lane>
  now: number
  columns: number
  viewKey?: string
  /** The timeline picture, when that tab is open. */
  picture?: Picture
  sparkline?: Picture
  /** The transcript of the agent whose detail shows it. */
  transcript?: TranscriptRow[] | 'unreadable'
}

/** One message of an agent's transcript, reduced to what the pane draws. */
export type TranscriptRow = { role: 'user' | 'assistant'; text: string; tools: { tool: string; summary: string; isError?: boolean }[] }

function pictureEl(k: Kit, p: Picture): RenderElement {
  if (p.kind === 'svg' && k.Svg) {
    return <k.Svg source={p.source} alt={p.alt} width={p.width} height={p.height} {...(p.interactive ? { isInteractive: true } : {})} />
  }
  if (p.kind === 'raster' && k.Raster) {
    const raster = <k.Raster key={p.key} cells={p.cells} columns={p.columns} rows={p.rows} />
    if (!p.labels) return raster
    return (
      <k.Box flexDirection="row">
        <k.Box flexDirection="column" width={22} flexShrink={0}>
          {p.labels.map(l => <k.Text color={l.color} dimColor={l.dim} wrap="truncate-end">{l.text}</k.Text>)}
        </k.Box>
        {raster}
      </k.Box>
    )
  }
  const lines = p.kind === 'text' ? p.lines : [{ text: p.kind === 'svg' ? p.alt : 'nothing to draw here', dim: true }]
  return <k.Box flexDirection="column">{lines.map(l => <k.Text color={l.color} dimColor={l.dim}>{l.text}</k.Text>)}</k.Box>
}

function legend(k: Kit): RenderElement {
  return (
    <k.Box flexDirection="row" flexWrap="wrap" columnGap={2}>
      {KIND_ORDER.filter(kind => kind !== 'other').map(kind => (
        <k.Text><k.Text color={KIND_SWATCH[kind].dark}>■</k.Text><k.Text dimColor> {KIND_LABEL[kind]}</k.Text></k.Text>
      ))}
    </k.Box>
  )
}

function toolName(tool: string): string {
  return tool.startsWith('mcp__') ? 'MCP' : tool
}

function spanLine(k: Kit, s: Span, t0: number): RenderElement {
  const dur = s.end === undefined ? 'running' : fmtDuration(s.end - s.start)
  return (
    <k.Text wrap="truncate-end">
      <k.Text dimColor>+{fmtDuration(Math.max(0, s.start - t0)).padStart(5)} </k.Text>
      <k.Text color={KIND_SWATCH[s.kind].dark}>▮</k.Text> {toolName(s.tool)}
      {s.summary ? <k.Text dimColor> {s.summary}</k.Text> : null}
      <k.Text dimColor> {dur}</k.Text>
      {s.isError ? <k.Text color={STATUS_SWATCH.error.dark}> ✗</k.Text> : null}
    </k.Text>
  )
}

function mixLine(k: Kit, counts: Partial<Record<Kind, number>>): RenderElement {
  return (
    <k.Text wrap="wrap">
      {KIND_ORDER.filter(kind => (counts[kind] ?? 0) > 0).map(kind => (
        <k.Text><k.Text color={KIND_SWATCH[kind].dark}>■</k.Text> {KIND_LABEL[kind]} {counts[kind]}  </k.Text>
      ))}
    </k.Text>
  )
}

const LIVE_VERB = { text: 'writing', thinking: 'thinking', tool: 'calling' } as const

/** What a running agent is doing this moment: its open tool call, or the tail of what it streams. */
function liveLine(k: Kit, lane: Lane, now: number): RenderElement | null {
  const open = [...lane.spans].reverse().find(s => s.end === undefined)
  if (open) {
    return (
      <k.Text wrap="truncate-end">
        <k.Text color={KIND_SWATCH[open.kind].dark}>▶</k.Text> {toolName(open.tool)}
        {open.summary ? <k.Text dimColor> {open.summary}</k.Text> : null}<k.Text dimColor> · {fmtDuration(now - open.start)}</k.Text>
      </k.Text>
    )
  }
  if (!lane.live) return null
  const tail = lane.live.text.replace(/\s+/g, ' ').trim()
  return (
    <k.Text wrap="truncate-start" dimColor={lane.live.kind === 'thinking'} italic={lane.live.kind === 'thinking'}>
      <k.Text color={textColor(lane.color, k.surface)}>{LIVE_VERB[lane.live.kind]}</k.Text> {tail}
    </k.Text>
  )
}

function transcriptView(k: Kit, rows: TranscriptRow[] | 'unreadable' | undefined): RenderElement {
  if (rows === undefined) return <k.Text dimColor>Reading the transcript…</k.Text>
  if (rows === 'unreadable') return <k.Text dimColor>This agent's transcript can't be read from here (workflow and remote agents keep theirs elsewhere).</k.Text>
  if (rows.length === 0) return <k.Text dimColor>Nothing in its transcript yet.</k.Text>
  const shown = rows.slice(-14)
  return (
    <k.Box flexDirection="column">
      {rows.length > shown.length ? <k.Text dimColor>… {rows.length - shown.length} earlier messages</k.Text> : null}
      {shown.map((m, i) => (
        <k.Box flexDirection="column" marginTop={i ? 1 : 0}>
          {m.role === 'user'
            ? (m.text ? <k.Text dimColor wrap="wrap">{i === 0 && rows.length === shown.length ? 'Task: ' : '› '}{clip(m.text, 600)}</k.Text> : null)
            : (m.text ? <k.Markdown text={clip(m.text, 1500)} /> : null)}
          {m.tools.map(t => (
            <k.Text wrap="truncate-end"><k.Text dimColor>  ⎿ </k.Text>{toolName(t.tool)}{t.summary ? <k.Text dimColor> {t.summary}</k.Text> : null}{t.isError ? <k.Text color={STATUS_SWATCH.error.dark}> ✗</k.Text> : null}</k.Text>
          ))}
        </k.Box>
      ))}
    </k.Box>
  )
}

// ---- the tree ----------------------------------------------------------------------

type TreeRow =
  | { t: 'group'; label: string; depth: number; rail: string }
  | { t: 'agent'; d: Digest; n: number; rail: string; childRail: string; children: number }

/**
 * Rows in display order with box-drawing rails (`├─`, `└─`, `│`), children of a
 * folded agent left out. `n` is the agent's arrival ordinal: what its Buttons are keyed by.
 */
export function treeRows(session: Session, folded: readonly string[]): TreeRow[] {
  const items: { d?: Digest; group?: string; depth: number }[] = []
  let run: string | undefined
  for (const key of session.order) {
    const d = session.digests[key]
    if (!d || d.hidden) continue
    if (d.run !== run) {
      run = d.run
      if (run !== undefined) {
        const wf = session.workflows[run]
        items.push({ group: wf?.name ? wf.name : `Workflow ${wf?.ordinal ?? ''}`.trim(), depth: Math.max(1, d.depth) })
      }
    }
    // A workflow's agents sit one level under its heading.
    items.push({ d, depth: d.depth + (d.run !== undefined ? 1 : 0) })
  }
  const out: TreeRow[] = []
  const fold = new Set(folded)
  // Keys by arrival, not position: a new agent above never shifts a Button being clicked.
  const ordinal = new Map(Object.keys(session.digests).map((k, i) => [k, i + 1]))
  let hideBelow = Infinity
  items.forEach((it, i) => {
    if (it.depth > hideBelow) return
    hideBelow = Infinity
    // Rails: for each ancestor level, a bar while that level has more rows to come.
    const more = (level: number) => {
      for (let j = i + 1; j < items.length; j++) {
        if (items[j]!.depth < level) return false
        if (items[j]!.depth === level) return true
      }
      return false
    }
    let rail = ''
    for (let l = 1; l < it.depth; l++) rail += more(l) ? '│ ' : '  '
    if (it.depth > 0) rail += more(it.depth) ? '├─' : '└─'
    let childRail = ''
    for (let l = 1; l <= it.depth; l++) childRail += more(l) ? '│ ' : '  '
    if (it.group !== undefined) {
      out.push({ t: 'group', label: it.group, depth: it.depth, rail })
      return
    }
    const d = it.d!
    let children = 0
    for (let j = i + 1; j < items.length && items[j]!.depth > it.depth; j++) if (items[j]!.d) children++
    out.push({ t: 'agent', d, n: ordinal.get(d.key) ?? out.length + 1, rail, childRail, children })
    if (fold.has(d.key) && children > 0) hideBelow = it.depth
  })
  return out
}

/** A running agent's name breathes between its color and the page's text, once a second. */
function nameColor(d: Digest, surface: RenderSurface, now: number): string | undefined {
  if (!isLive(d.status) || d.quiet) return d.key === 'main' ? textColor(-1, surface) : undefined
  return Math.floor(now / 1000) % 2 === 0 ? textColor(d.color, surface) : undefined
}

function agentRow(k: Kit, x: PaneInput, row: Extract<TreeRow, { t: 'agent' }>, a: Actions): RenderElement {
  const { d, n } = row
  const lane = x.lanes.get(d.key)
  const live = isLive(d.status) && !d.quiet
  const isOpen = (x.ui.expanded ?? []).includes(d.key)
  const isFolded = (x.ui.folded ?? []).includes(d.key)
  const viewed = x.viewKey === d.key
  const meta: string[] = []
  if (d.key !== 'main') meta.push(d.model ? `${d.type} · ${shortModel(d.model)}` : d.type)
  if (d.key !== 'main' || live) meta.push(`${STATUS_WORD[d.status]}${d.quiet ? ' (quiet)' : ''}`)
  if (d.key !== 'main') meta.push(fmtDuration(elapsed(d, x.now)))
  meta.push(`${d.tools} tools`, `${fmtTokens(d.tokens)} tok`)
  const stripWidth = 112
  const strip = k.Svg && lane && d.key !== 'main' && lane.spans.length > 0 && x.columns >= 90
    ? cardStripSvg(lane.spans, { width: stripWidth, t0: lane.spawnedAt ?? lane.firstAt, now: lane.lastAt, end: lane.endedAt, color: lane.color, live })
    : undefined
  const pad = row.childRail + '  '
  return (
    <k.Box flexDirection="column">
      <k.Box flexDirection="row" columnGap={1}>
        <k.Box flexDirection="row" flexShrink={0}>
          {row.rail ? <k.Text dimColor>{row.rail}</k.Text> : null}
          {row.children > 0
            ? <k.Button key={`fold-${n}`} plain dimColor label={isFolded ? `▸${row.children}` : '▾'} onPress={() => a.fold(d.key)} />
            : <k.Text dimColor>{row.rail ? '─' : ' '}</k.Text>}
        </k.Box>
        <k.Button key={`row-${n}`} plain onPress={() => a.expand(d.key)}>
          <k.Text color={textColor(d.color, k.surface)}>{liveGlyph(d, x.now)}</k.Text> <k.Text bold={live || d.key === 'main' || isOpen} color={nameColor(d, k.surface, x.now)} underline={viewed}>{clip(d.label, 48)}</k.Text>
        </k.Button>
        <k.Text dimColor wrap="truncate-end">{meta.join(' · ')}{d.errors ? ` · ${d.errors} errors` : ''}</k.Text>
        {strip && k.Svg ? <k.Box flexShrink={0}><k.Svg source={strip} alt={`${d.tools} tool calls`} width={stripWidth} height={14} /></k.Box> : null}
      </k.Box>
      {(() => {
        // Nothing to say yet draws nothing: no row of bare rails.
        const line = live && lane ? liveLine(k, lane, x.now) : null
        return line ? <k.Box flexDirection="row"><k.Text dimColor>{pad}</k.Text>{line}</k.Box> : null
      })()}
      {isOpen && lane ? (
        <k.Box flexDirection="row">
          <k.Text dimColor>{pad}</k.Text>
          {expandedBlock(k, x, d, lane, n, a)}
        </k.Box>
      ) : null}
    </k.Box>
  )
}

function shortModel(model: string): string {
  return model.replace(/^claude-/, '').replace(/-\d{8}$/, '')
}

function expandedBlock(k: Kit, x: PaneInput, d: Digest, lane: Lane, n: number, a: Actions): RenderElement {
  const u = laneUsage(lane)
  const parent = d.parent ? x.session.digests[d.parent] : undefined
  const showTranscript = x.ui.transcriptOf === d.key && d.key !== 'main'
  const answer = lane.answer ?? ''
  const recent = lane.spans.slice(-8)
  return (
    <k.Box flexDirection="column" borderStyle="round" borderDimColor paddingX={1} flexGrow={1}>
      <k.Text dimColor wrap="wrap">
        {fmtTokens(totalTokens(lane.tokens))} tokens
        {u.input + u.output > 0 ? ` (in ${fmtTokens(u.input)} · out ${fmtTokens(u.output)}${u.cacheWrite ? ` · cache write ${fmtTokens(u.cacheWrite)}` : ''})` : ''}
        {u.cacheRead ? ` · ${fmtTokens(u.cacheRead)} cached` : ''}
        {parent && d.key !== 'main' ? ` · from ${parent.label}` : ''}
      </k.Text>
      {lane.tools > 0 ? mixLine(k, lane.counts) : null}
      {d.key !== 'main' ? (
        <k.Box flexDirection="row" columnGap={1}>
          <k.Button key={`act-${n}`} label="Activity" variant={showTranscript ? undefined : 'primary'} onPress={() => a.transcript(undefined)} />
          <k.Button key={`tx-${n}`} label="Transcript" variant={showTranscript ? 'primary' : undefined} onPress={() => a.transcript(d.key)} />
          {a.jump && lane.meta?.toolUseId ? <k.Button key={`jump-${n}`} label="Show in conversation" dimColor onPress={() => a.jump?.(d.key)} /> : null}
        </k.Box>
      ) : null}
      {showTranscript ? transcriptView(k, x.transcript) : null}
      {!showTranscript && recent.length > 0 ? <k.Text dimColor>Recent calls{lane.tools > recent.length ? ` (last ${recent.length} of ${lane.tools})` : ''}</k.Text> : null}
      {!showTranscript ? recent.map(s => spanLine(k, s, lane.spawnedAt ?? lane.firstAt)) : null}
      {!showTranscript && answer ? <k.Markdown text={x.ui.fullAnswer ? answer : clip(answer, 700)} /> : null}
      {!showTranscript && answer.length > 700 ? <k.Box flexDirection="row"><k.Button key={`answer-${n}`} label={x.ui.fullAnswer ? 'Less' : 'Whole answer'} dimColor onPress={a.toggleAnswer} /></k.Box> : null}
    </k.Box>
  )
}

function tree(k: Kit, x: PaneInput, a: Actions): RenderElement {
  const rows = treeRows(x.session, x.ui.folded ?? [])
  return (
    <k.Box flexDirection="column">
      {rows.map(row => row.t === 'group'
        ? <k.Text dimColor>{row.rail}◇ {row.label}</k.Text>
        : agentRow(k, x, row, a))}
    </k.Box>
  )
}

/** The timeline is a picture and takes no clicks: its agents, as buttons that open them in the tree. */
function timelinePicks(k: Kit, x: PaneInput, a: Actions): RenderElement {
  const ordinal = new Map(Object.keys(x.session.digests).map((key, i) => [key, i + 1]))
  return (
    <k.Box flexDirection="row" flexWrap="wrap" columnGap={2}>
      <k.Text dimColor>Open:</k.Text>
      {subagents(x.session).map(d => (
        <k.Button key={`tl-${ordinal.get(d.key)}`} plain onPress={() => a.open?.(d.key)}>
          <k.Text color={textColor(d.color, k.surface)}>{liveGlyph(d, x.now)}</k.Text> {clip(d.label, 32)}
        </k.Button>
      ))}
    </k.Box>
  )
}

export function paneTree(k: Kit, x: PaneInput, a: Actions): RenderElement {
  const tabs: [UiState['tab'], string, string][] = [['tree', 'Agents', '1'], ['timeline', 'Timeline', '2']]
  const tab = x.ui.tab === 'timeline' ? 'timeline' : 'tree'
  const hasAgents = subagents(x.session).length > 0
  return (
    <k.Box flexDirection="column" gap={1}>
      <k.Box flexDirection="row" columnGap={2} flexWrap="wrap">
        <k.Text wrap="truncate-end">{statsLine(x.session, x.now)}</k.Text>
        {x.sparkline ? pictureEl(k, x.sparkline) : null}
      </k.Box>
      <k.Box flexDirection="row" columnGap={1}>
        {tabs.map(([id, label, key]) => (
          <k.Button key={`tab-${id}`} label={label} hotkey={key} variant={tab === id ? 'primary' : undefined} onPress={() => a.tab(id)} />
        ))}
        {tab === 'timeline' ? <k.Button key="window" label={x.ui.window === '10m' ? 'Last 10 min' : 'Whole session'} hotkey="w" dimColor onPress={a.toggleWindow} /> : null}
      </k.Box>
      {tab === 'tree' ? tree(k, x, a) : null}
      {tab === 'timeline' && x.picture ? pictureEl(k, x.picture) : null}
      {tab === 'timeline' && hasAgents ? legend(k) : null}
      {tab === 'timeline' && hasAgents ? timelinePicks(k, x, a) : null}
      {!hasAgents ? <k.Text dimColor>No subagents yet. They appear here as they spawn.</k.Text> : null}
    </k.Box>
  )
}

// ---- band --------------------------------------------------------------------

export function bandTree(k: Kit, session: Session, now: number, viewKey: string | undefined, grace: boolean, spark: Picture | undefined, a: Actions): RenderElement {
  const subs = subagents(session)
  const live = subs.filter(d => isLive(d.status) && !d.quiet)
  if (grace || live.length === 0) {
    const recent = subs.filter(d => d.endedAt !== undefined && now - d.endedAt < 15_000)
    const span = recent.length ? Math.max(...recent.map(d => (d.endedAt ?? now) - d.startedAt)) : 0
    return (
      <k.Box flexDirection="row" columnGap={1}>
        <k.Text><k.Text color={STATUS_SWATCH.ok.dark}>✓</k.Text> {recent.length} agent{recent.length === 1 ? '' : 's'} done in {fmtDuration(span)} <k.Text dimColor>· {recent.reduce((s, d) => s + d.tools, 0)} tools</k.Text></k.Text>
        {a.open ? <k.Button key="band-open" label="Agents" hotkey="o" plain dimColor onPress={() => a.open?.()} /> : null}
      </k.Box>
    )
  }
  return (
    <k.Box flexDirection="row" columnGap={1} flexWrap="wrap">
      <k.Text bold>◉ {live.length} agent{live.length === 1 ? '' : 's'}</k.Text>
      {live.slice(0, 6).map((d, i) => (
        <k.Button key={`band-${i + 1}`} plain onPress={() => a.open?.(d.key)}>
          <k.Text color={textColor(d.color, k.surface)}>●</k.Text> <k.Text bold={viewKey === d.key}>{clip(d.label, 22)}</k.Text> <k.Text dimColor>{fmtDuration(elapsed(d, now))}</k.Text>
        </k.Button>
      ))}
      {live.length > 6 ? <k.Text dimColor>+{live.length - 6}</k.Text> : null}
      {spark ? pictureEl(k, spark) : null}
      {a.open ? <k.Button key="band-open" label="Agents" hotkey="o" plain dimColor onPress={() => a.open?.()} /> : null}
    </k.Box>
  )
}

// ---- inline Agent card --------------------------------------------------------

export function cardTree(k: Kit, d: Digest | undefined, lane: Lane | undefined, input: { description?: string; subagentType?: string }, now: number, strip: Picture | undefined, children: number, a: Actions, below?: RenderElement): RenderElement {
  const live = d ? isLive(d.status) && !d.quiet : true
  const label = d?.label ?? (input.description ? clip(input.description, 48) : 'agent')
  const type = d?.type ?? input.subagentType ?? 'agent'
  const color = d?.color ?? 0
  return (
    <k.Box flexDirection="column">
      <k.Box flexDirection="column" borderStyle="round" borderColor={textColor(color, k.surface)} paddingX={1}>
        <k.Box flexDirection="row" justifyContent="space-between">
          <k.Text wrap="truncate-end">
            <k.Text color={textColor(color, k.surface)}>{d ? statusGlyph(d) : '●'}</k.Text> <k.Text bold>{type}</k.Text> <k.Text>{label}</k.Text>
            {d?.model ? <k.Text dimColor>  {d.model}</k.Text> : null}
          </k.Text>
          <k.Text color={d ? statusColor(d) : undefined}>{d ? `${STATUS_WORD[d.status]} ${fmtDuration(elapsed(d, now))}` : 'starting…'}</k.Text>
        </k.Box>
        {strip ? pictureEl(k, strip) : null}
        {lane ? (
          <k.Text dimColor wrap="truncate-end">
            {lane.tools} tools
            {KIND_ORDER.filter(kind => (lane.counts[kind] ?? 0) > 0).slice(0, 4).map(kind => ` · ${lane.counts[kind]} ${KIND_LABEL[kind].toLowerCase()}`).join('')}
            {' · '}{fmtTokens(totalTokens(lane.tokens))} tok{cachedTokens(lane.tokens) ? ` + ${fmtTokens(cachedTokens(lane.tokens))} cached` : ''}{children ? ` · ${children} nested` : ''}{lane.errors ? ` · ${lane.errors} errors` : ''}
          </k.Text>
        ) : null}
        {live && d?.last ? <k.Text dimColor wrap="truncate-end">↳ {d.last.summary || KIND_LABEL[d.last.kind]}</k.Text> : null}
        {a.open && d ? (
          <k.Box flexDirection="row"><k.Button key="card-details" label="Details" plain dimColor onPress={() => a.open?.(d.key)} /></k.Box>
        ) : null}
      </k.Box>
      {below ?? null}
    </k.Box>
  )
}
