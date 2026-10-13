// Sizes and limits every drawing shares. Pure: no `$`.

/** CSS pixels per character column on the desktop: a Svg sized from bodyColumns fits its pane. */
export const PX_PER_COLUMN = 8
/** One Svg's source is refused past 131,072 characters; stay well under (canvas measured 120k as safe). */
export const SVG_ELEMENT_MAX = 120_000
/** All the Svg one pane draws together. */
export const SVG_PAGE_BUDGET = 240_000
/** Inline cards and the band are small, static pictures. */
export const SVG_MINI_MAX = 4_000

/** Pixel width for a site `columns` wide, within sane bounds. */
export function pxWidth(columns: number, minus = 0): number {
  return Math.max(200, Math.min(1600, Math.round((columns - minus) * PX_PER_COLUMN)))
}

/**
 * The time axis' right end: now plus a quarter of the elapsed span (30 s at
 * least), kept while it still holds now, so a tick that adds nothing redraws
 * the identical picture.
 */
export function axisEnd(t0: number, now: number, previous: number | undefined): number {
  if (previous !== undefined && previous > now && previous - t0 < (now - t0) * 2 + 60_000) return previous
  return now + Math.max(30_000, Math.round((now - t0) * 0.25))
}

const STEPS_S = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600, 7200, 14_400]

/** A round tick interval (ms) giving at most `maxTicks` ticks over `spanMs`. */
export function niceStep(spanMs: number, maxTicks: number): number {
  for (const s of STEPS_S) if (spanMs / (s * 1000) <= Math.max(1, maxTicks)) return s * 1000
  return STEPS_S[STEPS_S.length - 1]! * 1000
}

/** An axis label for an offset from the start: `0s`, `45s`, `1:30`, `1h`, `1h30`. */
export function axisLabel(ms: number): string {
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  const m = Math.floor((s % 3600) / 60)
  return m === 0 ? `${Math.floor(s / 3600)}h` : `${Math.floor(s / 3600)}h${String(m).padStart(2, '0')}`
}
