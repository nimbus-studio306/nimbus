# Claude Code Workspace

This is Claude Code's output directory where Nimbus can find work products.

## Structure
- `CLAUDE.md` — Claude Code's memory/context file
- `tasks/` — Output from background tasks

## How Nimbus Calls Claude Code

**Quick question (sync with PTY):**
```bash
exec pty:true command:"claude -p 'Your question'"
```

**Background task:**
```bash
exec pty:true background:true command:"claude -p 'Your task' --allowedTools 'Read Write Edit Glob Grep Bash'"
```

**Monitor background tasks:**
```bash
process action:list
process action:log sessionId:XXX
process action:poll sessionId:XXX
```

## Notes
- Always use `pty:true` — Claude Code is an interactive terminal app
- Claude Code binary: `/home/papperpictures/.local/bin/claude`
- For long tasks, use background mode and monitor with process tool
