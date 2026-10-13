// The swimlane timeline: one lane per agent under its parent, tool calls as
// ticks colored by kind, model requests shaded in the agent's color, live
// heads pulsing. A string builder that measures itself and sheds detail,
// level by level, until it fits the Svg limit. Pure: no `$`.

import type { Kind, LaneStatus, Rollup, Span } from '../types'
import { fmtDuration, xmlEscape } from './format'
import { axisLabel, niceStep, SVG_ELEMENT_MAX } from './layout'
import { idClass, shimmerDef, STYLE } from './palette'

export type TimelineLaneRow = {
  t: 'lane'
  key: string
  label: string
  depth: number
  color: number
  status: LaneStatus
  isMain: boolean
  quiet?: boolean
  start: number
  end?: number
  spawnedAt?: number
  parentKey?: string
  runs: readonly { start: number; end?: number }[]
  steps: readonly { start: number; end?: number }[]
  spans: readonly Span[]
  rollups: readonly Rollup[]
  emphasis?: 'selected' | 'view'
  /** Recency rank for the lane cap: lower is kept first (main, live, emphasized, recent). */
  keep: number
}
export type TimelineGroupRow = {
  t: 'group'
  label: string
  depth: number
  /** A workflow run's span and phases: drawn as a band over its agents' lanes. */
  band?: { start: number; end?: number; live: boolean; ended?: 'ok' | 'error'; phases: { title: string; start?: number; end?: number }[] }
}
export type TimelineRow = TimelineLaneRow | TimelineGroupRow

export type TimelineOpts = {
  width: number
  now: number
  t0: number
  t1: number
  animate: boolean
  /** Lanes left out before drawing (past the drawn-lane cap). */
  moreCount?: number
}

export type Built = { source: string; level: number; alt: string; height: number }

const AXIS_H = 20
const ROW_H = 20
const GROUP_H = 20
const BAR_H = 14
const TICK_H = 8
const RECENT_TITLES = 40
const LIVE: ReadonlySet<LaneStatus> = new Set(['running', 'waiting', 'pending'])
/** Seconds of SMIL growth a live bar gets between redraws. */
const GROW_S = 60

type Level = { titles: 'all' | 'recent' | 'none'; ticks: 'each' | 'merged' | 'buckets'; maxLanes: number; summary?: true }
const LEVELS: readonly Level[] = [
  { titles: 'all', ticks: 'each', maxLanes: Infinity },
  { titles: 'recent', ticks: 'each', maxLanes: Infinity },
  { titles: 'none', ticks: 'merged', maxLanes: Infinity },
  { titles: 'none', ticks: 'buckets', maxLanes: Infinity },
  { titles: 'none', ticks: 'buckets', maxLanes: 40 },
  { titles: 'none', ticks: 'buckets', maxLanes: 15 },
  { titles: 'none', ticks: 'buckets', maxLanes: 0, summary: true },
]

const r = (n: number) => Math.round(n)

function isLive(row: TimelineLaneRow): boolean {
  return LIVE.has(row.status) && !row.quiet
}

const GLYPH: Partial<Record<LaneStatus, [string, string]>> = {
  completed: ['✓', 'ok'],
  failed: ['✗', 'err'],
  killed: ['■', 'mut'],
  lost: ['?', 'mut'],
  remote: ['↗', 'mut'],
  idle: ['◦', 'mut'],
}

function dominant(counts: Partial<Record<Kind, number>>): Kind {
  let best: Kind = 'other'
  let n = -1
  for (const [k, v] of Object.entries(counts) as [Kind, number][]) if (v > n) { best = k; n = v }
  return best
}

/** Which lanes a level keeps: groups survive when one of their lanes does. */
function pickRows(rows: readonly TimelineRow[], maxLanes: number): { rows: TimelineRow[]; dropped: number } {
  const lanes = rows.filter((x): x is TimelineLaneRow => x.t === 'lane')
  if (lanes.length <= maxLanes) return { rows: [...rows], dropped: 0 }
  const keep = new Set([...lanes].sort((a, b) => a.keep - b.keep).slice(0, maxLanes).map(l => l.key))
  const out: TimelineRow[] = []
  let pendingGroup: TimelineGroupRow | undefined
  for (const row of rows) {
    if (row.t === 'group') { pendingGroup = row; continue }
    if (!keep.has(row.key)) continue
    if (pendingGroup) { out.push(pendingGroup); pendingGroup = undefined }
    out.push(row)
  }
  return { rows: out, dropped: lanes.length - keep.size }
}

export function timelineAlt(rows: readonly TimelineRow[]): string {
  const lanes = rows.filter((x): x is TimelineLaneRow => x.t === 'lane' && !x.isMain)
  const live = lanes.filter(isLive).length
  const done = lanes.filter(l => l.status === 'completed').length
  const tools = rows.reduce((n, x) => n + (x.t === 'lane' ? x.spans.length : 0), 0)
  return `Timeline of ${lanes.length} subagent${lanes.length === 1 ? '' : 's'}: ${live} running, ${done} done, ${tools} recent tool calls`
}

function buildAt(all: readonly TimelineRow[], o: TimelineOpts, level: Level): { source: string; height: number } {
  const width = r(Math.max(200, o.width))
  const t0 = o.t0
  const t1 = Math.max(o.t1, t0 + 1000)
  const labelW = r(Math.max(130, Math.min(300, width * 0.34)))
  const x0 = labelW + 8
  const x1 = width - 26
  const span = t1 - t0
  const pxPerMs = (x1 - x0) / span
  const x = (t: number) => r(x0 + Math.max(0, Math.min(span, t - t0)) * pxPerMs)
  const growTo = (w: number, from: number) => Math.max(w, Math.min(w + pxPerMs * GROW_S * 1000, x1 - from))

  const { rows, dropped } = level.summary ? { rows: [] as TimelineRow[], dropped: 0 } : pickRows(all, level.maxLanes)
  const more = (o.moreCount ?? 0) + dropped + (level.summary ? all.filter(x => x.t === 'lane').length : 0)

  // Row positions first: spawn links need the parent's row.
  const yMid = new Map<string, number>()
  let y = AXIS_H
  const placed: { row: TimelineRow; top: number }[] = []
  for (const row of rows) {
    placed.push({ row, top: y })
    if (row.t === 'lane') yMid.set(row.key, y + ROW_H / 2)
    y += row.t === 'lane' ? ROW_H : GROUP_H
  }
  const height = y + (more > 0 ? 18 : 6)

  const out: string[] = []
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`)
  out.push(`<style>${STYLE}.lab{font-size:11px}.sm{font-size:10px}.g{opacity:.55}</style>`)

  // Axis: round ticks, faint grid, the now line.
  const step = niceStep(span, Math.floor((x1 - x0) / 70))
  const grid: string[] = []
  for (let t = 0; t <= span; t += step) {
    const gx = x(t0 + t)
    out.push(`<text x="${gx}" y="12" class="ax sm" text-anchor="middle">${axisLabel(t)}</text>`)
    grid.push(`M${gx} ${AXIS_H - 4}V${height - 4}`)
  }
  if (grid.length) out.push(`<path d="${grid.join('')}" class="sax" stroke-opacity=".12" fill="none"/>`)
  const nx = x(o.now)
  out.push(`<line x1="${nx}" y1="${AXIS_H - 6}" x2="${nx}" y2="${height - 4}" class="sax" stroke-opacity=".45" stroke-dasharray="3 3">${
    o.animate && o.now < t1 ? `<animate attributeName="x1" from="${nx}" to="${r(growTo(0, nx) + nx)}" dur="${GROW_S}s" fill="freeze"/><animate attributeName="x2" from="${nx}" to="${r(growTo(0, nx) + nx)}" dur="${GROW_S}s" fill="freeze"/>` : ''
  }</line>`)

  let shimmers = 0
  for (const { row, top } of placed) {
    if (row.t === 'group') {
      const ix = 4 + row.depth * 12
      const room = Math.max(4, Math.floor((labelW - ix - 6) / 6.1))
      const name = row.label.length > room ? `${row.label.slice(0, room - 1)}…` : row.label
      out.push(`<text x="${ix}" y="${top + 14}" class="fg sm" font-weight="600">◇ ${xmlEscape(name)}</text>`)
      const b = row.band
      if (!b) {
        out.push(`<line x1="${x0}" y1="${top + 10}" x2="${x1}" y2="${top + 10}" class="sax" stroke-opacity=".18"/>`)
        continue
      }
      // The run as a band, its phases as segments, each titled where it fits.
      const by = top + 5
      const bh = 11
      const rx0 = x(b.start)
      const rw = Math.max(2, x(b.end ?? o.now) - rx0)
      out.push(`<rect x="${rx0}" y="${by}" width="${rw}" height="${bh}" rx="3" class="trk" fill-opacity=".18"/>`)
      b.phases.forEach((p, pi) => {
        if (p.start === undefined) return
        const px = x(p.start)
        const pw = Math.max(2, x(p.end ?? b.end ?? o.now) - px)
        out.push(`<rect x="${px}" y="${by}" width="${pw}" height="${bh}" rx="2" class="fi${pi % 7}" fill-opacity="${p.end === undefined ? '.55' : '.35'}">${level.titles !== 'none' ? `<title>${xmlEscape(p.title)}</title>` : ''}</rect>`)
        const fits = Math.floor((pw - 6) / 5.6)
        if (fits >= 3) out.push(`<text x="${px + 4}" y="${by + 8.5}" class="fg" font-size="8.5">${xmlEscape(p.title.length > fits ? `${p.title.slice(0, fits - 1)}…` : p.title)}</text>`)
      })
      if (b.live) out.push(`<circle cx="${x(o.now)}" cy="${by + bh / 2}" r="3" class="fim"/>`)
      else if (b.ended) out.push(`<text x="${x1 + 8}" y="${top + 14}" class="${b.ended === 'ok' ? 'ok' : 'err'} lab">${b.ended === 'ok' ? '✓' : '✗'}</text>`)
      continue
    }
    const mid = top + ROW_H / 2
    const id = idClass(row.color)
    const live = isLive(row)
    const ix = 4 + row.depth * 12

    if (row.emphasis) out.push(`<rect x="0" y="${top}" width="${width}" height="${ROW_H}" class="fi${id}" fill-opacity="${row.emphasis === 'selected' ? '.10' : '.06'}"/>`)

    // Label column: tree rail, identity dot, the name.
    if (row.depth > 0) out.push(`<path d="M${ix - 7} ${mid - 10}V${mid}H${ix - 1}" class="sax" stroke-opacity=".5" fill="none"/>`)
    out.push(`<circle cx="${ix + 4}" cy="${mid}" r="3.5" class="fi${id}"/>`)
    const room = Math.max(4, Math.floor((labelW - ix - 14) / 6.1))
    const name = row.label.length > room ? `${row.label.slice(0, room - 1)}…` : row.label
    if (live && o.animate && !row.isMain && level.titles !== 'none') {
      const gid = `sh${shimmers++}`
      out.push(`<defs>${shimmerDef(gid, row.color, ix + 12, name.length * 6.4, true)}</defs>`)
      out.push(`<text x="${ix + 12}" y="${mid + 4}" class="lab" fill="url(#${gid})">${xmlEscape(name)}</text>`)
    } else {
      out.push(`<text x="${ix + 12}" y="${mid + 4}" class="fg lab"${row.isMain ? ' font-weight="600"' : ''}${row.quiet ? ' opacity=".55"' : ''}>${xmlEscape(name)}</text>`)
    }

    // Spawn link from the parent's row.
    const py = row.parentKey !== undefined ? yMid.get(row.parentKey) : undefined
    if (py !== undefined && row.spawnedAt !== undefined) {
      const sx = x(row.spawnedAt)
      out.push(`<path d="M${sx} ${py}V${mid}" class="si${id}" stroke-opacity=".5" stroke-dasharray="2 2" fill="none"/>`)
    }

    // Alive track (main: faint whole session, its turns brighter).
    const end = row.end ?? o.now
    const bx = x(row.start)
    const bw = Math.max(2, x(end) - bx)
    const barTop = mid - BAR_H / 2
    const grow = live && o.animate && row.end === undefined
    const growAnim = (w: number, from: number) => grow ? `<animate attributeName="width" from="${w}" to="${r(growTo(w, from))}" dur="${GROW_S}s" fill="freeze"/>` : ''
    out.push(`<rect x="${bx}" y="${barTop}" width="${bw}" height="${BAR_H}" rx="3" class="fi${id}" fill-opacity="${row.isMain ? '.06' : '.16'}">${row.isMain ? '' : growAnim(bw, bx)}</rect>`)
    for (const run of row.isMain || row.runs.length > 1 ? row.runs : []) {
      const rx0 = x(run.start)
      const rw = Math.max(2, x(run.end ?? o.now) - rx0)
      out.push(`<rect x="${rx0}" y="${barTop}" width="${rw}" height="${BAR_H}" rx="3" class="fi${id}" fill-opacity=".16">${run.end === undefined ? growAnim(rw, rx0) : ''}</rect>`)
    }

    // Model requests: brighter shading in the agent's color.
    if (row.steps.length) {
      const d: string[] = []
      for (const s of row.steps) {
        const sx = x(s.start)
        const sw = Math.max(1, x(s.end ?? o.now) - sx)
        d.push(`M${sx} ${barTop}h${sw}v${BAR_H}h${-sw}z`)
      }
      out.push(`<path d="${d.join('')}" class="fi${id}" fill-opacity=".38"/>`)
    }

    // Tool calls.
    const ty = mid - TICK_H / 2
    for (const ru of row.rollups) {
      const rx0 = x(ru.start)
      const rw = Math.max(2, x(ru.end) - rx0)
      const n = Object.values(ru.counts).reduce((a, b) => a + (b ?? 0), 0)
      const title = level.titles === 'none' ? '' : `<title>${n} earlier calls</title>`
      out.push(`<rect x="${rx0}" y="${ty}" width="${rw}" height="${TICK_H}" class="k-${dominant(ru.counts)}" fill-opacity=".5">${title}</rect>`)
    }
    if (level.ticks === 'each') {
      const titled = level.titles === 'all' ? 0 : Math.max(0, row.spans.length - RECENT_TITLES)
      row.spans.forEach((s, i) => {
        const sx = x(s.start)
        const open = s.end === undefined
        const sw = Math.max(2, x(s.end ?? o.now) - sx)
        const anim = open && grow ? `<animate attributeName="width" from="${sw}" to="${r(growTo(sw, sx))}" dur="${GROW_S}s" fill="freeze"/>` : ''
        const tip = level.titles !== 'none' && i >= titled
          ? `<title>${xmlEscape(s.summary ? `${s.tool} · ${s.summary}` : s.tool)} · ${open ? 'running' : fmtDuration((s.end ?? o.now) - s.start)}${s.isError ? ' · error' : ''}</title>`
          : ''
        out.push(`<rect x="${sx}" y="${ty}" width="${sw}" height="${TICK_H}" class="k-${s.kind}"${open ? ' fill-opacity=".75"' : ''}>${tip}${anim}</rect>`)
        if (s.isError) out.push(`<rect x="${sx}" y="${ty - 2}" width="${sw}" height="2" class="err"/>`)
      })
    } else if (level.ticks === 'merged') {
      const byKind = new Map<Kind, string[]>()
      const errs: string[] = []
      for (const s of row.spans) {
        const sx = x(s.start)
        const sw = Math.max(2, x(s.end ?? o.now) - sx)
        const list = byKind.get(s.kind) ?? []
        list.push(`M${sx} ${ty}h${sw}v${TICK_H}h${-sw}z`)
        byKind.set(s.kind, list)
        if (s.isError) errs.push(`M${sx} ${ty - 2}h${sw}v2h${-sw}z`)
      }
      for (const [k, d] of byKind) out.push(`<path d="${d.join('')}" class="k-${k}"/>`)
      if (errs.length) out.push(`<path d="${errs.join('')}" class="err"/>`)
    } else {
      // Buckets: each a few pixels, the dominant kind's color, denser is brighter.
      const bucketPx = Math.max(3, Math.round((x1 - x0) / Math.min(240, Math.max(30, Math.floor((x1 - x0) / 3)))))
      const buckets = new Map<number, Partial<Record<Kind, number>>>()
      for (const s of row.spans) {
        const b = Math.floor((x(s.start) - x0) / bucketPx)
        const c = buckets.get(b) ?? {}
        c[s.kind] = (c[s.kind] ?? 0) + 1
        buckets.set(b, c)
      }
      let max = 1
      for (const c of buckets.values()) max = Math.max(max, Object.values(c).reduce((a, v) => a + (v ?? 0), 0))
      for (const [b, c] of buckets) {
        const n = Object.values(c).reduce((a, v) => a + (v ?? 0), 0)
        out.push(`<rect x="${x0 + b * bucketPx}" y="${ty}" width="${bucketPx - 1}" height="${TICK_H}" class="k-${dominant(c)}" fill-opacity="${(0.35 + 0.65 * (n / max)).toFixed(2)}"/>`)
      }
    }

    // Live head, or how it ended.
    if (live) {
      const hx = x(o.now)
      const pulse = o.animate
        ? `<animate attributeName="r" values="3;6;3" dur="1.4s" repeatCount="indefinite"/><animate attributeName="fill-opacity" values="1;.45;1" dur="1.4s" repeatCount="indefinite"/>` +
          (grow ? `<animate attributeName="cx" from="${hx}" to="${r(hx + growTo(0, hx))}" dur="${GROW_S}s" fill="freeze"/>` : '')
        : ''
      out.push(`<circle cx="${hx}" cy="${mid}" r="3.5" class="fi${id}">${pulse}</circle>`)
    } else {
      const g = row.quiet ? (['⋯', 'mut'] as [string, string]) : GLYPH[row.status]
      if (g) out.push(`<text x="${x1 + 8}" y="${mid + 4}" class="${g[1]} lab">${g[0]}</text>`)
    }
  }

  if (more > 0) {
    out.push(`<text x="4" y="${height - 5}" class="ax sm">${level.summary ? `${more} agents: too much activity to draw here; the Feed tab lists them` : `+${more} more agent${more === 1 ? '' : 's'} not drawn`}</text>`)
  }
  out.push('</svg>')
  return { source: out.join(''), height }
}

/** Builds at the richest level that fits `max` characters. */
export function buildTimelineSvg(rows: readonly TimelineRow[], o: TimelineOpts, max = SVG_ELEMENT_MAX): Built {
  // Start where a rough count says the first fit lies, then step down by measuring.
  const ticks = rows.reduce((n, x) => n + (x.t === 'lane' ? x.spans.length + x.steps.length + x.rollups.length : 0), 0)
  let start = 0
  if (ticks * 110 > max) start = 1
  if (ticks * 40 > max) start = 2
  for (let i = start; i < LEVELS.length; i++) {
    const built = buildAt(rows, o, LEVELS[i]!)
    if (built.source.length <= max) return { ...built, level: i, alt: timelineAlt(rows) }
  }
  const last = buildAt(rows, o, LEVELS[LEVELS.length - 1]!)
  return { ...last, level: LEVELS.length - 1, alt: timelineAlt(rows) }
}
