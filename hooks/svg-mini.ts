// Small static pictures: the tick strip on an inline Agent card and the
// activity sparkline in the band and the stats strip. No animation (they are
// redrawn often and drawn as plain images). Pure: no `$`.

import type { Kind, Span } from '../types'
import { KIND_ORDER } from './kinds'
import { SVG_MINI_MAX } from './layout'
import { idClass, MINI_STYLE } from './palette'

/** Tool calls per time bucket, newest last: the band's and the stats strip's sparkline. */
export type Activity = { at: number; counts: Partial<Record<Kind, number>> }[]

export const ACTIVITY_BUCKET_MS = 5_000
export const ACTIVITY_WINDOW_MS = 120_000

/** Adds tool starts to the activity buckets and drops buckets older than the window. */
export function foldActivity(prev: Activity, starts: readonly { at: number; kind: Kind }[], now: number): Activity {
  const byAt = new Map(prev.map(b => [b.at, { at: b.at, counts: { ...b.counts } }]))
  for (const s of starts) {
    const at = Math.floor(s.at / ACTIVITY_BUCKET_MS) * ACTIVITY_BUCKET_MS
    const b = byAt.get(at) ?? { at, counts: {} }
    b.counts[s.kind] = (b.counts[s.kind] ?? 0) + 1
    byAt.set(at, b)
  }
  const floor = now - ACTIVITY_WINDOW_MS - ACTIVITY_BUCKET_MS
  return [...byAt.values()].filter(b => b.at >= floor).sort((a, b) => a.at - b.at)
}

/** Stacked bars of tool calls per 5 s over the last two minutes, colored by kind. */
export function sparklineSvg(activity: Activity, now: number, width: number, height = 18): string {
  const w = Math.max(60, Math.round(width))
  const n = Math.round(ACTIVITY_WINDOW_MS / ACTIVITY_BUCKET_MS)
  const bw = w / n
  const start = Math.floor(now / ACTIVITY_BUCKET_MS) * ACTIVITY_BUCKET_MS - (n - 1) * ACTIVITY_BUCKET_MS
  let max = 1
  for (const b of activity) max = Math.max(max, Object.values(b.counts).reduce((s, v) => s + (v ?? 0), 0))
  const out: string[] = [`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${height}" viewBox="0 0 ${w} ${height}"><style>${MINI_STYLE}</style>`]
  out.push(`<rect x="0" y="${height - 1}" width="${w}" height="1" class="trk" fill-opacity=".35"/>`)
  for (const b of activity) {
    const i = Math.round((b.at - start) / ACTIVITY_BUCKET_MS)
    if (i < 0 || i >= n) continue
    let y = height - 1
    for (const k of KIND_ORDER) {
      const v = b.counts[k] ?? 0
      if (!v) continue
      const h = Math.max(1, Math.round(((height - 2) * v) / max))
      y -= h
      out.push(`<rect x="${Math.round(i * bw)}" y="${y}" width="${Math.max(1, Math.round(bw) - 1)}" height="${h}" class="k-${k}"/>`)
    }
  }
  out.push('</svg>')
  const s = out.join('')
  return s.length <= SVG_MINI_MAX ? s : out.slice(0, 2).join('') + '</svg>'
}

/** A lane's recent tool calls as ticks on its alive track, for an inline card. */
export function cardStripSvg(spans: readonly Span[], o: { width: number; t0: number; now: number; end?: number; color: number; live: boolean }): string {
  const w = Math.max(80, Math.round(o.width))
  const h = 14
  const id = idClass(o.color)
  const t1 = Math.max((o.end ?? o.now) + 1000, o.t0 + 10_000)
  const x = (t: number) => Math.round(((Math.max(o.t0, Math.min(t1, t)) - o.t0) / (t1 - o.t0)) * (w - 8))
  const head = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><style>${MINI_STYLE}</style>` +
    `<rect x="0" y="2" width="${Math.max(2, x(o.end ?? o.now))}" height="10" rx="3" class="fi${id}" fill-opacity=".18"/>`
  const tail = (o.live ? `<circle cx="${x(o.now)}" cy="7" r="3.5" class="fi${id}"/>` : '') + '</svg>'
  const ticks: string[] = []
  let size = head.length + tail.length
  // Newest first until the budget is spent, then drawn oldest first.
  for (let i = spans.length - 1; i >= 0; i--) {
    const s = spans[i]!
    const sx = x(s.start)
    const t = `<rect x="${sx}" y="4" width="${Math.max(2, x(s.end ?? o.now) - sx)}" height="6" class="k-${s.kind}"/>` +
      (s.isError ? `<rect x="${sx}" y="2" width="2" height="2" class="err"/>` : '')
    if (size + t.length > SVG_MINI_MAX) break
    size += t.length
    ticks.push(t)
  }
  return head + ticks.reverse().join('') + tail
}
