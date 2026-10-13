// The terminal's pictures: a Raster per drawing, cells packed as the engine
// takes them (base64 of little-endian u32 triplets [codePoint, fg, bg]).
// Pure: no `$`.

import type { Kind, LaneStatus, Span } from '../types'
import { identity, KIND_SWATCH } from './palette'
import type { Activity } from './svg-mini'
import { ACTIVITY_BUCKET_MS, ACTIVITY_WINDOW_MS } from './svg-mini'

const DEFAULT = 0x01000000

export type Cell = [codePoint: number, fg: number, bg: number]

function hex(c: string): number {
  return parseInt(c.slice(1), 16) & 0xffffff
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

function base64(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]!
    const b = bytes[i + 1]
    const c = bytes[i + 2]
    out += B64[a >> 2]! + B64[((a & 3) << 4) | ((b ?? 0) >> 4)]!
    out += b === undefined ? '=' : B64[((b & 15) << 2) | ((c ?? 0) >> 6)]!
    out += c === undefined ? '=' : B64[c & 63]!
  }
  return out
}

/** Packs a grid (row-major, every row `columns` long) as Raster `cells`. */
export function packCells(grid: readonly Cell[], columns: number, rows: number): string {
  const words = new Uint32Array(columns * rows * 3)
  for (let i = 0; i < columns * rows; i++) {
    const cell = grid[i] ?? [0x20, DEFAULT, DEFAULT]
    words[i * 3] = cell[0]
    words[i * 3 + 1] = cell[1]
    words[i * 3 + 2] = cell[2]
  }
  return base64(new Uint8Array(words.buffer))
}

export type RasterLane = {
  color: number
  status: LaneStatus
  live: boolean
  start: number
  end?: number
  spans: readonly Span[]
  steps: readonly { start: number; end?: number }[]
}

/**
 * One row per lane, one cell per time bucket: `█` in the dominant tool kind's
 * color where calls ran, `░` in the agent's color for model time, `·` alive and
 * idle, `▶` for a live head.
 */
export function timelineCells(lanes: readonly RasterLane[], o: { columns: number; t0: number; t1: number; now: number }): { cells: string; columns: number; rows: number } {
  const columns = Math.max(1, Math.min(512, o.columns))
  const rows = Math.max(1, Math.min(256, lanes.length))
  const span = Math.max(1000, o.t1 - o.t0)
  const col = (t: number) => Math.max(0, Math.min(columns - 1, Math.floor(((t - o.t0) / span) * columns)))
  const grid: Cell[] = new Array(columns * rows)
  lanes.slice(0, rows).forEach((lane, r) => {
    const id = hex(identity(lane.color).dark)
    const kinds: (Partial<Record<Kind, number>> | undefined)[] = new Array(columns)
    const model: boolean[] = new Array(columns).fill(false)
    for (const s of lane.spans) {
      for (let c = col(s.start); c <= col(s.end ?? o.now); c++) {
        const k = (kinds[c] ??= {})
        k[s.kind] = (k[s.kind] ?? 0) + 1
      }
    }
    for (const s of lane.steps) for (let c = col(s.start); c <= col(s.end ?? o.now); c++) model[c] = true
    const a = col(lane.start)
    const b = col(lane.end ?? o.now)
    for (let c = 0; c < columns; c++) {
      let cell: Cell = [0x20, DEFAULT, DEFAULT]
      const k = kinds[c]
      if (k) {
        let best: Kind = 'other'
        let n = -1
        for (const [kk, v] of Object.entries(k) as [Kind, number][]) if (v > n) { best = kk; n = v }
        cell = [0x2588, hex(KIND_SWATCH[best].dark), DEFAULT]
      } else if (model[c]) cell = [0x2591, id, DEFAULT]
      else if (c >= a && c <= b) cell = [0x00b7, id, DEFAULT]
      grid[r * columns + c] = cell
    }
    if (lane.live) grid[r * columns + col(o.now)] = [0x25b6, id, DEFAULT]
  })
  return { cells: packCells(grid, columns, rows), columns, rows }
}

/** One row of ▁▂▃▄▅▆▇█ for tool calls per 5 s over two minutes. */
export function sparkCells(activity: Activity, now: number, columns = 24): { cells: string; columns: number; rows: number } {
  const n = Math.max(1, Math.min(512, columns))
  const start = Math.floor(now / ACTIVITY_BUCKET_MS) * ACTIVITY_BUCKET_MS - (Math.round(ACTIVITY_WINDOW_MS / ACTIVITY_BUCKET_MS) - 1) * ACTIVITY_BUCKET_MS
  const per = Math.round(ACTIVITY_WINDOW_MS / ACTIVITY_BUCKET_MS) / n
  const totals = new Array(n).fill(0)
  const tops: (Kind | undefined)[] = new Array(n)
  for (const b of activity) {
    const i = Math.floor((b.at - start) / ACTIVITY_BUCKET_MS / per)
    if (i < 0 || i >= n) continue
    for (const [k, v] of Object.entries(b.counts) as [Kind, number][]) {
      totals[i] += v
      if (!tops[i] || (b.counts[tops[i]!] ?? 0) < v) tops[i] = k
    }
  }
  const max = Math.max(1, ...totals)
  const grid: Cell[] = totals.map((t, i) =>
    t === 0 ? [0x2581, hex('#5a5045'), DEFAULT] : [0x2581 + Math.min(7, Math.round((t / max) * 7)), hex(KIND_SWATCH[tops[i] ?? 'other'].dark), DEFAULT],
  )
  return { cells: packCells(grid, n, 1), columns: n, rows: 1 }
}
