// Reading what a Workflow run leaves behind: the phase titles its script
// declares, and the notification the engine posts when the run ends.
// Pure: no `$`.

import type { RunStatus } from '../types'
import { clip, sanitize } from './format'

/**
 * The phase titles a workflow script's `meta.phases` declares, in order. The
 * meta block is a pure literal by the Workflow tool's rule, so the titles are
 * read straight from its text; anything unreadable gives [].
 */
export function parsePhases(script: string): string[] {
  const start = script.indexOf('phases')
  if (start < 0) return []
  const open = script.indexOf('[', start)
  if (open < 0) return []
  let depth = 0
  let end = -1
  for (let i = open; i < script.length; i++) {
    const c = script[i]
    if (c === '[') depth++
    else if (c === ']' && --depth === 0) { end = i; break }
  }
  if (end < 0) return []
  const out: string[] = []
  for (const m of script.slice(open, end).matchAll(/title\s*:\s*(['"`])((?:\\.|(?!\1).)*)\1/g)) {
    const title = clip(sanitize(m[2]!.replace(/\\(.)/g, '$1')), 40)
    if (title && !out.includes(title)) out.push(title)
    if (out.length >= 24) break
  }
  return out
}

export type RunEnd = { taskId: string; toolUseId?: string; status: RunStatus; agents?: number; tokens?: number; durationMs?: number }

const tag = (text: string, name: string): string | undefined => {
  const m = text.match(new RegExp(`<${name}>([^<]*)</${name}>`))
  return m ? m[1]!.trim() : undefined
}

const num = (s: string | undefined): number | undefined => {
  const n = s === undefined ? NaN : Number(s)
  return Number.isFinite(n) && n >= 0 ? n : undefined
}

/**
 * A background task's end-of-run notification, if `text` holds one: its task
 * id, the tool_use id of the call that started it, how it ended and, for a
 * workflow, its usage. Undefined for any other text.
 */
export function parseNotification(text: string): RunEnd | undefined {
  const i = text.indexOf('<task-notification>')
  if (i < 0) return undefined
  const body = text.slice(i, text.indexOf('</task-notification>', i) + 1 || undefined)
  const taskId = tag(body, 'task-id')
  const raw = tag(body, 'status')
  if (!taskId || !raw) return undefined
  const status: RunStatus = raw === 'completed' ? 'completed' : raw === 'killed' || raw === 'stopped' ? 'killed' : 'failed'
  return {
    taskId,
    toolUseId: tag(body, 'tool-use-id'),
    status,
    agents: num(tag(body, 'agent_count')),
    tokens: num(tag(body, 'subagent_tokens')),
    durationMs: num(tag(body, 'duration_ms')),
  }
}

export type TranscriptTool = { tool: string; summary: string; isError?: boolean }
export type TranscriptMessage = { role: 'user' | 'assistant'; text: string; tools: TranscriptTool[] }

const COMPUTED = '[Workflow harness — computed task]'
const RELAYED = '[Workflow harness — user request]'

/**
 * A workflow agent's transcript file (`agent-<id>.jsonl`, one record per line)
 * as messages: its task (the computed task text, the harness wrapper taken
 * off), then each assistant reply with the tool calls it made, consecutive
 * replies merged. The relayed user request and tool results are left out; a
 * failed tool result marks its call. `summarize` names a call (kinds.ts).
 */
export function parseTranscript(jsonl: string, summarize: (tool: string, input: unknown) => string): TranscriptMessage[] {
  const out: TranscriptMessage[] = []
  const byId = new Map<string, TranscriptTool>()
  for (const line of jsonl.split('\n')) {
    if (!line.trim()) continue
    let rec: { type?: string; isMeta?: boolean; message?: { role?: string; content?: unknown } }
    try { rec = JSON.parse(line) } catch { continue }
    if (rec.isMeta || (rec.type !== 'user' && rec.type !== 'assistant')) continue
    const content = rec.message?.content
    if (rec.type === 'user') {
      if (typeof content === 'string') {
        if (content.startsWith(RELAYED)) continue
        let text = content
        if (content.startsWith(COMPUTED)) {
          const at = content.indexOf('follows:\n')
          text = at < 0 ? '' : content.slice(at + 'follows:\n'.length).replace(/^ {2}/gm, '')
        }
        if (text.trim()) out.push({ role: 'user', text: text.trim(), tools: [] })
        continue
      }
      for (const b of Array.isArray(content) ? content : []) {
        if (b?.type === 'tool_result' && b.is_error) {
          const t = byId.get(String(b.tool_use_id))
          if (t) t.isError = true
        }
      }
      continue
    }
    const blocks = Array.isArray(content) ? content : typeof content === 'string' ? [{ type: 'text', text: content }] : []
    let last = out[out.length - 1]
    if (!last || last.role !== 'assistant') {
      last = { role: 'assistant', text: '', tools: [] }
      out.push(last)
    }
    for (const b of blocks) {
      if (b?.type === 'text' && typeof b.text === 'string' && b.text.trim()) last.text = last.text ? `${last.text}\n\n${b.text}` : b.text
      if (b?.type === 'tool_use') {
        const t: TranscriptTool = { tool: String(b.name ?? 'tool'), summary: summarize(String(b.name ?? ''), b.input) }
        last.tools.push(t)
        if (b.id) byId.set(String(b.id), t)
      }
    }
  }
  return out.filter(m => m.role === 'user' || m.text || m.tools.length)
}
