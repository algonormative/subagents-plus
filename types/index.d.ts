// subagents-plus's $.state contract and the shapes its pure modules share.
// Ids (agent ids, tool_use ids, workflow run ids) live in these records as
// keys only: nothing a person reads is built from them (format.ts label()).

/** What a tool call does, for color and counting. */
export type Kind = 'read' | 'search' | 'edit' | 'write' | 'bash' | 'web' | 'mcp' | 'agent' | 'other'

/** One request's or turn's token counts, as the API spells them, renamed. */
export type Usage = { input: number; output: number; cacheRead: number; cacheWrite: number }

/**
 * Where a lane stands. The engine's AgentStatus plus two of ours:
 * `lost` (the engine stopped listing it without saying it ended) and
 * `remote` (a remote launch whose loop never reports here).
 */
export type LaneStatus = 'pending' | 'running' | 'waiting' | 'idle' | 'completed' | 'failed' | 'killed' | 'lost' | 'remote'

/** One tool call on a lane. `id` is the tool_use id: internal, never drawn. */
export type Span = {
  id: string
  kind: Kind
  tool: string
  /** Short, sanitized: a basename, a clipped command, a hostname. */
  summary: string
  start: number
  end?: number
  isError?: true
  isInterrupted?: true
  /** For an Agent call: the lane key of the agent it started. */
  child?: string
}

/** Closed spans folded together once a lane holds too many. */
export type Rollup = { start: number; end: number; counts: Partial<Record<Kind, number>>; errors: number }

/** One model request of a lane (turn.step), for model-time shading. */
export type Step = { turnId: string; index: number; start: number; end?: number }

/** What the spawn said about a lane; absent until the spawn record lands. */
export type LaneMeta = {
  description: string
  /** Agent type: `Explore`, `general-purpose`, a plugin's, `fork`, `teammate`. */
  type: string
  name?: string
  model?: string
  isTeammate?: true
  isFork?: true
  background?: boolean
  /** Parent lane key: an agent id, or 'main'. */
  parent: string
  /** Workflow run key (internal key into Session.workflows). */
  run?: string
  runIndex?: number
  /** The Agent (or Workflow) tool_use id that started it. */
  toolUseId?: string
}

export type LaneTokens = {
  /** Totals of finished turns, each from its turn.complete (or its steps when complete had none). */
  committed: Usage
  /** Per-request usage of turns still running, keyed `${turnId}:${index}`. */
  provisional: Record<string, Usage>
  /** turnIds already committed, newest last, at most 64: a repeat complete is a no-op. */
  turnsDone: string[]
  /** A foreground Agent result's totalTokens: shown only while committed and provisional are empty. */
  fallback?: number
}

export type Lane = {
  v: 1
  /** Agent id, or 'main'. */
  key: string
  epoch: number
  /** Index into the identity palette; main is -1. */
  color: number
  meta?: LaneMeta
  status: LaneStatus
  firstAt: number
  lastAt: number
  spawnedAt?: number
  endedAt?: number
  /** Active intervals: main's turns, a teammate's wakes, a resumed agent's runs. */
  runs: { start: number; end?: number }[]
  spans: Span[]
  rollups: Rollup[]
  steps: Step[]
  /** Exact, whatever was folded. */
  counts: Partial<Record<Kind, number>>
  errors: number
  tools: number
  tokens: LaneTokens
  /** What the model is streaming now (tail of text or thinking, or the tool being called); cleared when its turn ends. */
  live?: { kind: 'text' | 'thinking' | 'tool'; text: string; at: number }
  /** Final answer, clipped to 4000 characters. */
  answer?: string
  /** True once a workflow lane has been silent for 10 minutes: drawn faded, never given an invented end. */
  quiet?: true
  /** When reconcile first found it missing from $.agent.list(). */
  missingSince?: number
  /** Seen in $.agent.list() at least once. */
  listed?: true
  /** A workflow agent's phase, read from its meta.json. */
  phase?: string
}

/** The small per-lane summary the band, the constellation and the chips read. */
export type Digest = {
  key: string
  label: string
  type: string
  model?: string
  status: LaneStatus
  color: number
  parent?: string
  depth: number
  run?: string
  startedAt: number
  endedAt?: number
  /** Time of the lane's latest event (listed/unlisted aside): staleness and hidden-lane GC read it. */
  lastAt?: number
  /** Fresh tokens: input, output and cache writes. */
  tokens: number
  /** Cache reads, counted apart. */
  cached?: number
  tools: number
  errors: number
  mix: Partial<Record<Kind, number>>
  last?: { kind: Kind; summary: string; at: number }
  quiet?: true
  /** True when the lane has no meta yet (an engine fork, or a spawn record still on its way): not drawn. */
  hidden?: true
  /** A workflow agent's phase. */
  phase?: string
}

export type RunStatus = 'running' | 'completed' | 'failed' | 'killed' | 'remote'

/** A Workflow tool run: what its call returned, what its script declares, and how it ended. */
export type WorkflowRun = {
  name?: string
  at: number
  ordinal: number
  /** The background task id the Workflow call returned: what the end-of-run notification names. */
  taskId?: string
  status?: RunStatus
  startedAt?: number
  endedAt?: number
  /** Phase titles, in the order the script's `meta.phases` declares them. */
  phases?: string[]
  /** Where the run keeps each agent's transcript and meta.json (local runs). */
  transcriptDir?: string
  scriptPath?: string
  /** The Workflow tool_use id: which transcript row the run's card draws on. */
  toolUseId?: string
  /** A remote run's cloud session. */
  sessionUrl?: string
  /** From the end-of-run notification. */
  agents?: number
  durationMs?: number
  tokens?: number
}

/** A change to a run record; fields left out keep their value. */
export type RunPatch = Partial<Omit<WorkflowRun, 'at' | 'ordinal'>>

export type Session = {
  v: 1
  epoch: number
  startedAt: number
  /** Lane keys in display order: depth-first from main, children in spawn order, workflow runs together. */
  order: string[]
  digests: Record<string, Digest>
  /** Workflow runs by run id: the name the Workflow call's result gave, and when it was first seen. */
  workflows: Record<string, WorkflowRun>
  colorNext: number
  live: number
  done: number
  failed: number
  /** Lanes evicted past the cap, their totals kept so session totals stay true. */
  archived: { lanes: number; tokens: number; cached?: number; tools: number; errors: number }
  totals: { tokens: number; cached?: number; tools: number; errors: number }
  costUsd?: number
  lastEventAt: number
  firstSpawnAt?: number
  /** Tool calls per 5 s bucket over the last two minutes, for the sparklines. */
  activity?: { at: number; counts: Partial<Record<Kind, number>> }[]
}

export type Tab = 'tree' | 'timeline'

export type UiState = {
  tab: Tab
  /** Agents whose detail shows under their row. */
  expanded?: string[]
  /** Agents whose children are hidden. */
  folded?: string[]
  /** The agent whose detail shows its transcript instead of its activity. */
  transcriptOf?: string
  window: 'all' | '10m'
  userClosed: boolean
  autoOpenedEpoch?: number
  fullAnswer?: boolean
}

declare module 'claude-code' {
  interface PluginState {
    'subagents-plus': {
      session: Session | null
      ui: UiState
      lanes: StateFamily<Lane | null>
      byToolUse: StateFamily<string[] | null>
      tick: number
    }
  }
}
