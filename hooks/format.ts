// Pure text helpers: nothing a person reads is built without passing here.
// Ids never reach the screen; label() is the one place a lane gets a name.

import type { LaneMeta } from '../types'

// C0 and C1 controls, plus the bidi overrides and isolates that can reorder text.
const UNSAFE = /[\u0000-\u001f\u007f-\u009f‪-‮⁦-⁩]/g

/** Strip control and bidi characters, collapse whitespace, trim. */
export function sanitize(s: string): string {
  return String(s ?? '').replace(/\s+/g, ' ').replace(UNSAFE, '').replace(/\s+/g, ' ').trim()
}

const SECRET_WORDS = '(?:key|token|secret|password|auth)'
const FLAG_SECRET = new RegExp(`(--[A-Za-z0-9-]*${SECRET_WORDS}[A-Za-z0-9-]*)(?:\\s+|=)(\\S+)`, 'gi')
const ASSIGN_SECRET = new RegExp(`\\b([A-Za-z0-9_]*${SECRET_WORDS}[A-Za-z0-9_]*)=("[^"]*"|'[^']*'|\\S*)`, 'gi')
const LONG_RUN = /[A-Za-z0-9_\-+/=]{24,}/g

/** Replace likely secrets (named assignments, flags, long opaque runs) with an ellipsis. */
export function scrubSecrets(s: string): string {
  return String(s ?? '')
    .replace(FLAG_SECRET, '$1=…')
    .replace(ASSIGN_SECRET, '$1=…')
    .replace(LONG_RUN, (run) => (/[A-Za-z]/.test(run) && /[0-9]/.test(run) ? '…' : run))
}

const HOME = /(?:\/Users|\/home)\/[^/\s'"]+(?=\/|\s|$)|C:\\Users\\[^\\\s'"]+/g

/** Home directories written as `~`: shorter, and a summary never shows whose machine it ran on. */
export function tildeHome(s: string): string {
  return String(s ?? '').replace(HOME, '~')
}

/** At most n characters, a clipped string ending in '…'. */
export function clip(s: string, n: number): string {
  if (n <= 0) return ''
  return s.length <= n ? s : s.slice(0, n - 1) + '…'
}

export function xmlEscape(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function fmtDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '0s'
  if (ms < 10_000) return `${(ms / 1000).toFixed(1)}s`
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s`
  const total = Math.floor(ms / 1000)
  if (ms < 3_600_000) return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
  const m = Math.floor((total % 3600) / 60)
  return `${Math.floor(total / 3600)}h ${String(m).padStart(2, '0')}m`
}

export function fmtTokens(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '0'
  if (n < 1000) return String(Math.round(n))
  const k = Math.round(n / 100) / 10
  if (n < 1e6 && k < 1000) return `${String(k)}k`
  return `${String(Math.round(n / 1e5) / 10)}M`
}

/** A lane's display name; ids (the key, a run id) never appear in it. */
export function label(meta: LaneMeta | undefined, key: string): string {
  if (key === 'main') return 'main'
  const pick = [meta?.name, meta?.description, meta?.type ? `${meta.type} agent` : undefined]
  for (const c of pick) {
    const t = clip(sanitize(c ?? ''), 48)
    if (t && !(key.length >= 4 && t.includes(key))) return t
  }
  return 'agent'
}
