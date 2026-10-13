// What a tool call is (for color and counting) and a one-line, safe summary of it.

import type { Kind } from '../types'
import { clip, sanitize, scrubSecrets } from './format'

export const KIND_ORDER: Kind[] = ['read', 'search', 'edit', 'write', 'bash', 'web', 'mcp', 'agent', 'other']

export const KIND_LABEL: Record<Kind, string> = {
  read: 'Read',
  search: 'Search',
  edit: 'Edit',
  write: 'Write',
  bash: 'Shell',
  web: 'Web',
  mcp: 'MCP',
  agent: 'Agents',
  other: 'Other',
}

const BASH_TOOLS = ['Bash', 'BashOutput', 'KillShell', 'Monitor', 'PowerShell']
const AGENT_TOOLS = ['Agent', 'Task', 'Workflow', 'SendMessage', 'TaskStop', 'TaskOutput']
const SEARCH_CMDS = ['rg', 'grep', 'find', 'fd', 'ls', 'tree']
const READ_CMDS = ['cat', 'head', 'tail', 'less', 'bat', 'wc']

function rec(input: unknown): Record<string, unknown> {
  return input !== null && typeof input === 'object' ? (input as Record<string, unknown>) : {}
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

/** The command's own first word, after any `cd x &&` and `VAR=value` prefixes. */
function bashRest(command: string): string {
  let c = command.trim()
  for (let i = 0; i < 8; i++) {
    const next = c
      .replace(/^cd\s+\S+\s*(?:&&|;)\s*/, '')
      .replace(/^[A-Za-z_][A-Za-z0-9_]*=(?:"[^"]*"|'[^']*'|\S*)\s+/, '')
    if (next === c) break
    c = next
  }
  return c
}

export function classify(tool: string, input: unknown): Kind {
  const t = String(tool)
  if (t === 'Read' || t === 'NotebookRead') return 'read'
  if (t === 'Grep' || t === 'Glob' || t === 'LSP') return 'search'
  if (t === 'Edit' || t === 'MultiEdit' || t === 'NotebookEdit') return 'edit'
  if (t === 'Write') return 'write'
  if (t === 'Bash') {
    const rest = bashRest(str(rec(input).command))
    const word = (rest.split(/\s+/)[0] ?? '').split('/').pop() ?? ''
    if (SEARCH_CMDS.includes(word)) return 'search'
    if (READ_CMDS.includes(word) || (word === 'sed' && /^sed\s+(?:-\S+\s+)*-[A-Za-z]*n/.test(rest))) return 'read'
    return 'bash'
  }
  if (BASH_TOOLS.includes(t)) return 'bash'
  if (t === 'WebFetch' || t === 'WebSearch') return 'web'
  if (t.startsWith('mcp__')) return /browser|chrome/i.test(t) ? 'web' : 'mcp'
  if (AGENT_TOOLS.includes(t)) return 'agent'
  return 'other'
}

function tail(path: string): string {
  const parts = path.split(/[\\/]/).filter(Boolean)
  return parts.slice(-2).join('/')
}

function base(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).pop() ?? ''
}

function host(url: string): string {
  const m = /^[a-z][a-z0-9+.-]*:\/\/(?:[^/@?#]*@)?([^/:?#]+)/i.exec(url.trim())
  return m?.[1] ?? url
}

function raw(tool: string, input: unknown): string {
  const i = rec(input)
  switch (tool) {
    case 'Read':
    case 'Edit':
    case 'MultiEdit':
    case 'Write':
    case 'NotebookEdit':
    case 'NotebookRead':
      return tail(str(i.file_path) || str(i.notebook_path))
    case 'Grep': {
      const p = str(i.pattern)
      const where = base(str(i.path))
      return p ? `"${p}"${where ? ` in ${where}` : ''}` : ''
    }
    case 'Glob':
      return str(i.pattern)
    case 'Bash':
      return str(i.command).trim().split('\n')[0] ?? ''
    case 'WebFetch':
      return host(str(i.url))
    case 'WebSearch':
      return str(i.query)
    case 'Agent':
    case 'Task':
      return str(i.description)
    case 'Workflow':
      return str(i.name) || str(i.description) || str(i.workflow)
    case 'SendMessage':
      // A teammate's name reads well; an agent id does not, so ids are left out.
      return /^[A-Za-z][\w-]{0,31}$/.test(str(i.to)) && !/[0-9a-f]{6}/i.test(str(i.to)) ? `to ${str(i.to)}` : 'message'
    case 'Skill':
      return str(i.skill) || str(i.name)
  }
  if (tool.startsWith('mcp__')) {
    const [server, ...rest] = tool.slice(5).split('__')
    return rest.length ? `${server} · ${rest.join('__')}` : (server ?? '')
  }
  return ''
}

/** Short, single-line, secret-free, at most 60 characters; never throws. */
export function summarize(tool: string, input: unknown): string {
  try {
    return clip(scrubSecrets(sanitize(raw(String(tool), input))), 60)
  } catch {
    return ''
  }
}
