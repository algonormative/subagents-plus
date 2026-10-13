import { expect, test } from 'claude-code/testing'

import type { Kind, Span } from '../types'
import { packCells, sparkCells, timelineCells } from './raster'
import { cardStripSvg, foldActivity, sparklineSvg } from './svg-mini'
import { buildTimelineSvg } from './svg-timeline'
import type { TimelineLaneRow, TimelineRow } from './svg-timeline'

const T0 = 1_800_000_000_000
const KINDS: Kind[] = ['read', 'search', 'edit', 'write', 'bash', 'web', 'mcp', 'agent', 'other']

function spans(n: number, from: number, summary = 'file.ts'): Span[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `toolu_${from}_${i}`, kind: KINDS[i % KINDS.length]!, tool: 'Read', summary,
    start: from + i * 300, end: from + i * 300 + 200, ...(i % 17 === 0 ? { isError: true as const } : {}),
  }))
}

function lane(key: string, depth: number, n: number, over: Partial<TimelineLaneRow> = {}): TimelineLaneRow {
  return {
    t: 'lane', key, label: `agent ${key}`, depth, color: depth === 0 ? -1 : depth, status: 'completed', isMain: key === 'main',
    start: T0, end: T0 + n * 300 + 500, runs: [{ start: T0, end: T0 + n * 300 }], steps: [{ start: T0, end: T0 + 100 }],
    spans: spans(n, T0), rollups: [], keep: depth, ...over,
  }
}

const OPTS = { width: 900, now: T0 + 120_000, t0: T0, t1: T0 + 150_000, animate: true }

/** Every opened tag closes: a small tokenizer, not a parser. */
function balanced(svg: string): boolean {
  const stack: string[] = []
  for (const m of svg.replace(/<style>[\s\S]*?<\/style>/g, '').matchAll(/<(\/?)([a-zA-Z]+)[^>]*?(\/?)>/g)) {
    const [, close, name, self] = m
    if (self) continue
    if (close) { if (stack.pop() !== name) return false } else stack.push(name!)
  }
  return stack.length === 0
}

test('a small timeline draws every tick with tooltips and live animation', async () => {
  const rows: TimelineRow[] = [lane('main', 0, 5), lane('a', 1, 12, { status: 'running', end: undefined }), { t: 'group', label: 'audit', depth: 1 }, lane('b', 2, 3)]
  const b = buildTimelineSvg(rows, OPTS)
  expect(b.level).toBe(0)
  expect(b.source.startsWith('<svg')).toBe(true)
  expect(b.source.endsWith('</svg>')).toBe(true)
  expect(balanced(b.source)).toBe(true)
  expect(b.source).toContain('<title>')
  expect(b.source).toContain('<animate')
  expect(b.source).toContain('◇ audit')
  expect(b.source).not.toMatch(/NaN|undefined/)
})

test('without animation or live lanes no SMIL is drawn', async () => {
  const still = buildTimelineSvg([lane('main', 0, 5), lane('a', 1, 12, { status: 'running', end: undefined })], { ...OPTS, animate: false })
  expect(still.source).not.toContain('<animate')
  const done = buildTimelineSvg([lane('a', 1, 12)], OPTS)
  expect(done.source).not.toContain('repeatCount')
})

test('a huge session stays under the Svg limit and says what it left out', async () => {
  const rows: TimelineRow[] = [lane('main', 0, 2000)]
  for (let i = 0; i < 200; i++) rows.push(lane(`x${i}`, 1 + (i % 3), 2000, { keep: 10 + i }))
  const b = buildTimelineSvg(rows, OPTS)
  expect(b.source.length).toBeLessThanOrEqual(120_000)
  expect(b.level).toBeGreaterThanOrEqual(3)
  expect(b.source).toMatch(/more agent|too much activity/)
  expect(balanced(b.source)).toBe(true)
})

test('text from tool input is escaped, never markup', async () => {
  const evil = lane('a', 1, 3, { label: '<script>alert(1)</script>', spans: spans(3, T0, '"><script>x</script><g onload="y"') })
  const b = buildTimelineSvg([evil], OPTS)
  expect(b.source).not.toContain('<script')
  // No tag carries an event attribute: input text stays inside escaped text.
  expect(b.source).not.toMatch(/<[^>]*\son\w+=/)
  expect(b.source).toContain('&lt;script&gt;')
})

test('width follows the pane and identical input builds an identical picture', async () => {
  const rows = [lane('main', 0, 5), lane('a', 1, 8)]
  expect(buildTimelineSvg(rows, { ...OPTS, width: 320 }).source).toContain('width="320"')
  expect(buildTimelineSvg(rows, { ...OPTS, width: 960 }).source).toContain('width="960"')
  expect(buildTimelineSvg(rows, OPTS).source).toBe(buildTimelineSvg(rows, OPTS).source)
})

test('mini pictures stay small and the activity window slides', async () => {
  const strip = cardStripSvg(spans(5000, T0), { width: 600, t0: T0, now: T0 + 2_000_000, color: 2, live: true })
  expect(strip.length).toBeLessThanOrEqual(4_000)
  expect(balanced(strip)).toBe(true)
  let act = foldActivity([], spans(40, T0).map(s => ({ at: s.start, kind: s.kind })), T0 + 12_000)
  expect(act.reduce((n, b) => n + Object.values(b.counts).reduce((a, v) => a + (v ?? 0), 0), 0)).toBe(40)
  act = foldActivity(act, [], T0 + 600_000)
  expect(act).toEqual([])
  const spark = sparklineSvg(foldActivity([], spans(40, T0).map(s => ({ at: s.start, kind: s.kind })), T0 + 12_000), T0 + 12_000, 160)
  expect(spark.length).toBeLessThanOrEqual(4_000)
})

test('terminal rasters pack whole cells of printable glyphs', async () => {
  const packed = packCells([[0x2588, 0xff8800, 0x01000000]], 1, 1)
  expect(packed).toBe('iCUAAACI/wAAAAAB')
  const tl = timelineCells([{ color: 1, status: 'running', live: true, start: T0, spans: spans(30, T0), steps: [] }], { columns: 40, t0: T0, t1: T0 + 20_000, now: T0 + 10_000 })
  expect(tl.columns).toBe(40)
  expect(tl.rows).toBe(1)
  // 40 cells x 12 bytes = 480 bytes = 640 base64 characters.
  expect(tl.cells.length).toBe(640)
  const sp = sparkCells([{ at: T0, counts: { read: 3 } }], T0 + 1000, 24)
  expect(sp.cells.length).toBe(Math.ceil((24 * 12) / 3) * 4)
})
