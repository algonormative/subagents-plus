# Changelog

## 0.1.0

First release.

- `/subagents` pane: an expandable tree of every subagent nested under the agent that spawned it, workflow agents grouped under their workflow. Each row shows status, type and model, elapsed time, tool calls and tokens; running agents show what they are doing right now. Expand a row for its token breakdown (cache reads counted apart), tool mix, recent calls, answer and an in-pane transcript.
- Timeline tab: swimlanes of tool calls and model time per agent.
- Live cards on Agent tool rows (desktop app), with the engine's own row kept underneath.
- A band above the prompt while subagents run.
