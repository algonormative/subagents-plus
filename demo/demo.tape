# Records the terminal demo: vhs demo/demo.tape
# Needs a logged-in `claude` with subagents-plus installed. DEMO_DIR is a
# project to work in (demo/setup.sh makes one); DEMO_SETTINGS optionally
# points at a settings file that turns other plugins off for a clean view.
Output demo/terminal.gif
Require claude
Set Shell bash
Set FontSize 15
Set Width 1600
Set Height 1100
Set Padding 24
Set Framerate 12
Set PlaybackSpeed 2.5
Set TypingSpeed 25ms
Set Theme "Catppuccin Mocha"

Hide
Type 'unset CLAUDE_CODE_CHILD_SESSION CLAUDECODE CLAUDE_CODE_ENTRYPOINT; cd "$DEMO_DIR" && clear && claude ${DEMO_SETTINGS:+--settings "$DEMO_SETTINGS"} --strict-mcp-config --allowedTools "Read Grep Glob Agent" 2>/dev/null'
Enter
Sleep 6s
# Answer the folder-trust question (its default is No) if it appears.
Down
Enter
Sleep 10s
Show

Type "/subagents"
Sleep 600ms
Enter
Sleep 2s
Type "Spawn two general-purpose subagents in parallel: one maps the hooks in hooks/register.tsx, one reviews the tests in hooks/*.test.*. Each should spawn one Explore subagent of its own for a narrower question, and read files one chunk per call. Then summarise in 5 lines."
Sleep 500ms
Enter
Sleep 25s
Screenshot demo/terminal-live.png
Sleep 50s
Screenshot demo/terminal-done.png
Sleep 5s
Type "/exit"
Enter
Sleep 2s
