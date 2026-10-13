// Colors: agent identity (one per lane, cycling) and tool kind. Taken from the
// Endless Bounty theme, whose *_FOR_SUBAGENTS_ONLY keys are the engine's own
// subagent colors, dark values first and light ones for a light page.
// Pure: no `$`.

import type { Kind } from '../types'

type Swatch = { dark: string; light: string; /** A theme key Text can name on the terminal, when the theme has one. */ key?: string }

/** Main loop: the theme's claude orange. */
export const MAIN_SWATCH: Swatch = { dark: '#e07b39', light: '#d05010', key: 'claude' }

/** Subagent identities, in assignment order. Red is left out: it means failure here. */
export const IDENTITY: readonly Swatch[] = [
  { dark: '#7090b0', light: '#2050a0', key: 'blue_FOR_SUBAGENTS_ONLY' },
  { dark: '#8cb369', light: '#2d7818', key: 'green_FOR_SUBAGENTS_ONLY' },
  { dark: '#e0a458', light: '#b07020', key: 'yellow_FOR_SUBAGENTS_ONLY' },
  { dark: '#9b6b9e', light: '#7030a0', key: 'purple_FOR_SUBAGENTS_ONLY' },
  { dark: '#609888', light: '#108868', key: 'cyan_FOR_SUBAGENTS_ONLY' },
  { dark: '#d87070', light: '#d83030', key: 'pink_FOR_SUBAGENTS_ONLY' },
  { dark: '#b89a6a', light: '#8a6a30' },
]

export const KIND_SWATCH: Record<Kind, Swatch> = {
  read: { dark: '#7090b0', light: '#2050a0' },
  search: { dark: '#609888', light: '#108868' },
  edit: { dark: '#e0a458', light: '#b07020' },
  write: { dark: '#e07b39', light: '#d05010' },
  bash: { dark: '#9b6b9e', light: '#7030a0' },
  web: { dark: '#8cb369', light: '#2d7818' },
  mcp: { dark: '#d87070', light: '#d83030' },
  agent: { dark: '#dcc8a8', light: '#6a5a40' },
  other: { dark: '#7d8471', light: '#788068' },
}

export const STATUS_SWATCH = {
  ok: { dark: '#8cb369', light: '#2d7818' },
  error: { dark: '#c75d5d', light: '#c03030' },
  muted: { dark: '#7d8471', light: '#788068' },
  fg: { dark: '#dcc8a8', light: '#3a3225' },
  axis: { dark: '#8c8478', light: '#7a7060' },
  track: { dark: '#7d8471', light: '#788068' },
}

export function identity(color: number): Swatch {
  return color < 0 ? MAIN_SWATCH : IDENTITY[color % IDENTITY.length] ?? IDENTITY[0]!
}

/** What a desktop Text names for a lane: its dark hex (the desktop app keeps its own contrast). */
export function textColor(color: number, surface: string): string {
  const s = identity(color)
  return surface === 'terminal' && s.key ? s.key : s.dark
}

const KINDS = Object.keys(KIND_SWATCH) as Kind[]

/**
 * The stylesheet every drawing shares: identity classes `fi0`..`fi6`/`fim`
 * (fill) and `si*` (stroke), kind classes `k-read`..., and the text classes.
 * Dark values by default; a light page swaps them.
 */
function sheet(scheme: 'dark' | 'light'): string {
  const out: string[] = []
  const pick = (s: Swatch) => (scheme === 'dark' ? s.dark : s.light)
  IDENTITY.forEach((s, i) => out.push(`.fi${i}{fill:${pick(s)}}.si${i}{stroke:${pick(s)}}`))
  out.push(`.fim{fill:${pick(MAIN_SWATCH)}}.sim{stroke:${pick(MAIN_SWATCH)}}`)
  IDENTITY.forEach((s, i) => out.push(`.st${i}{stop-color:${pick(s)}}`))
  out.push(`.stm{stop-color:${pick(MAIN_SWATCH)}}.st-fg{stop-color:${pick(STATUS_SWATCH.fg)}}`)
  for (const k of KINDS) out.push(`.k-${k}{fill:${pick(KIND_SWATCH[k])}}.sk-${k}{stroke:${pick(KIND_SWATCH[k])}}`)
  out.push(
    `.fg{fill:${pick(STATUS_SWATCH.fg)}}.ax{fill:${pick(STATUS_SWATCH.axis)}}.sax{stroke:${pick(STATUS_SWATCH.axis)}}`,
    `.ok{fill:${pick(STATUS_SWATCH.ok)}}.err{fill:${pick(STATUS_SWATCH.error)}}.serr{stroke:${pick(STATUS_SWATCH.error)}}`,
    `.mut{fill:${pick(STATUS_SWATCH.muted)}}.trk{fill:${pick(STATUS_SWATCH.track)}}.strk{stroke:${pick(STATUS_SWATCH.track)}}`,
  )
  return out.join('')
}

export const STYLE =
  `text{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",sans-serif}` +
  sheet('dark') +
  `@media (prefers-color-scheme: light){${sheet('light')}}`

/**
 * A gradient that sweeps the agent's color across text drawn in the page's
 * foreground: a live agent's name shimmers. `width` is the text's extent.
 */
export function shimmerDef(id: string, color: number, x: number, width: number, animate: boolean): string {
  const w = Math.max(40, Math.round(width))
  const sweep = animate
    ? `<animateTransform attributeName="gradientTransform" type="translate" from="${-w} 0" to="${w} 0" dur="2.4s" repeatCount="indefinite"/>`
    : ''
  return `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${x}" y1="0" x2="${x + w}" y2="0">` +
    `<stop offset="0" class="st-fg"/><stop offset=".4" class="st-fg"/><stop offset=".5" class="st${idClass(color)}"/>` +
    `<stop offset=".6" class="st-fg"/><stop offset="1" class="st-fg"/>${sweep}</linearGradient>`
}

/** Fill classes alone (identity, kind, err, trk): the small pictures' stylesheet. */
function fills(scheme: 'dark' | 'light'): string {
  const pick = (s: Swatch) => (scheme === 'dark' ? s.dark : s.light)
  return IDENTITY.map((s, i) => `.fi${i}{fill:${pick(s)}}`).join('') +
    `.fim{fill:${pick(MAIN_SWATCH)}}` +
    KINDS.map(k => `.k-${k}{fill:${pick(KIND_SWATCH[k])}}`).join('') +
    `.err{fill:${pick(STATUS_SWATCH.error)}}.trk{fill:${pick(STATUS_SWATCH.track)}}`
}

export const MINI_STYLE = fills('dark') + `@media (prefers-color-scheme: light){${fills('light')}}`

/** The class suffix of a lane's identity: `0`..`6`, or `m` for main. */
export function idClass(color: number): string {
  return color < 0 ? 'm' : String(color % IDENTITY.length)
}
