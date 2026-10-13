# Changelog

## 0.2.2

- Workflow agents' transcripts open in the pane. The engine doesn't hand them to mods, so the mod reads the agent's transcript file from its run's folder: the task it was given (the harness wrapper taken off), then each reply with its tool calls.
- Tool counts read "1 tool", not "1 tools".
- Releases no longer carry stale compiled `.js` copies of the hooks.
- README: a terminal screenshot of a workflow run.

## 0.2.1

- The Workflow-row card draws in the terminal. The desktop app draws its own native card for Workflow calls and never offers that row to mods, so there it keeps its own.
- A run's name stays on one line in the tree.

## 0.2.0

Workflows.

- A Workflow run is a row of its own in the tree: its name, status (running, done, failed, stopped, remote), agents done of total, elapsed time and tokens. Its agents sit under it, grouped by phase in the order the script declares them, each phase with its own progress. Fold a run with its `▾`.
- The run ends when the engine's end-of-run notification arrives. If that was missed (a reload mid-run), a run whose agents have all finished counts as done after a minute of quiet.
- Timeline: each run is a band over its agents' lanes, split into phase segments.
- Desktop: a live card on the Workflow tool row, with phase progress and a Details button that opens the run in the pane.
- Remote runs show as remote, with a link to their cloud session.

## 0.1.3

- Agents tree: a running agent with nothing to report yet no longer draws an empty line of rails.
- README: screenshots.

## 0.1.2

- Timeline: a wider name column (up to a third of the pane), so agent names are readable.

## 0.1.1

- Home directories show as `~` in tool summaries, live lines and transcripts, so the pane never shows whose machine an agent ran on.
- The `diagnostics` option is off unless set to true, matching its documented default.

## 0.1.0

First release.

- `/subagents` pane: an expandable tree of every subagent nested under the agent that spawned it, workflow agents grouped under their workflow. Each row shows status, type and model, elapsed time, tool calls and tokens; running agents show what they are doing right now. Expand a row for its token breakdown (cache reads counted apart), tool mix, recent calls, answer and an in-pane transcript.
- Timeline tab: swimlanes of tool calls and model time per agent.
- Live cards on Agent tool rows (desktop app), with the engine's own row kept underneath.
- A band above the prompt while subagents run.
