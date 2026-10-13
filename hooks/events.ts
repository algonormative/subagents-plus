// The events the hooks capture and the reducer (model.ts) folds into lanes.
// Pure: no `$`. Every event carries the epoch it was captured in (a /clear
// bumps it, and the reducer drops events of an older one) and its own time.

import type { Kind, LaneMeta, LaneStatus, Usage } from '../types'

type Base = { epoch: number; at: number }

/** The main loop's lane key. Every other lane is keyed by its agent id. */
export const MAIN = 'main'

export type Ev =
  /** A subagent started: agent.spawn's input and what next(e) resolved. */
  | (Base & { t: 'spawned'; lane: string; meta: LaneMeta })
  /** A tool call began on a lane (tool.call before next). */
  | (Base & { t: 'tool-start'; lane: string; id: string; tool: string; kind: Kind; summary: string })
  /**
   * A tool call ended. It repeats start's fields and its own `startedAt`, so a
   * span can be built from the end alone when the start was lost or late.
   */
  | (Base & {
      t: 'tool-end'
      lane: string
      id: string
      tool: string
      kind: Kind
      summary: string
      startedAt: number
      isError: boolean
      isInterrupted?: boolean
      /** An Agent call's started agent (from its result's agentId). */
      child?: string
      /** A foreground Agent call's totals: the fallback until its turn.complete lands. */
      childTotals?: { tokens: number; tools: number; durationMs: number }
      /** How an Agent call launched: completed in the foreground, sent to the background, remote, a teammate. */
      launch?: 'completed' | 'async' | 'remote' | 'teammate'
      /** A Workflow call's run, so its agents group under the workflow's name. */
      workflow?: { runId: string; name?: string }
    })
  /**
   * What the parent's Agent call reported about the child it started, routed to
   * the child's lane by planBatch: a foreground run's totals (the token fallback)
   * and how it launched (`remote` lanes never report a loop here).
   */
  | (Base & { t: 'child-report'; lane: string; tokens?: number; launch?: 'completed' | 'async' | 'remote' | 'teammate' })
  /** What a lane's model is streaming right now: the tail of its text or thinking, or the tool it is calling. */
  | (Base & { t: 'say'; lane: string; kind: 'text' | 'thinking' | 'tool'; text: string })
  /** The main loop began a turn (turn.start fires for main only). */
  | (Base & { t: 'turn-start'; lane: string; turnId: string })
  /** A model request began on a lane (turn.step before next). */
  | (Base & { t: 'step-start'; lane: string; turnId: string; index: number; model: string })
  /** A model request finished (turn.step after next); usage is that request's. */
  | (Base & { t: 'step-end'; lane: string; turnId: string; index: number; usage?: Usage })
  /** A turn ended. For a subagent, one run of its loop. Usage is the turn's sum; absent on interrupt or error. */
  | (Base & {
      t: 'turn-complete'
      lane: string
      turnId: string
      reason: 'answer' | 'aborted' | 'refusal' | 'error'
      durationMs: number
      usage?: Usage
      answer: string
    })
  /**
   * What $.agent.list() said of a lane on a reconcile pass, as a synthetic event:
   * its status, and the meta of a lane the list names but no spawn described.
   */
  | (Base & { t: 'listed'; lane: string; status: LaneStatus; adopt?: LaneMeta })
  /** Reconcile found a once-listed lane missing from the list (it may have ended unseen). */
  | (Base & { t: 'unlisted'; lane: string })

export type EvType = Ev['t']

/** The token counts of an API usage record, any of its fields missing as 0. */
export function usageOf(u: unknown): Usage | undefined {
  if (u === null || typeof u !== 'object') return undefined
  const r = u as Record<string, unknown>
  const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0)
  return {
    input: n(r.input_tokens),
    output: n(r.output_tokens),
    cacheRead: n(r.cache_read_input_tokens),
    cacheWrite: n(r.cache_creation_input_tokens),
  }
}
