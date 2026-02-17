# HEARTBEAT.md — Active Tasks

## ⚠️ CRITICAL: Pending Conversation Check (DO FIRST)
Before doing ANYTHING else, check:
1. **Was there a user message that I haven't responded to?**
2. **Was I in the middle of a task for the user?**
3. **Is there pending work from the last conversation?**

**If YES to any of these:** DO NOT reply HEARTBEAT_OK. Continue the conversation or complete the task.
**Only reply HEARTBEAT_OK if:** No pending user interaction AND nothing urgent.

This prevents hour-long response gaps. See `docs/reliability-issues.md` for context.

## Every Heartbeat
1. **Update SESSIONS.md** — run `sessions_list`, refresh timestamps, topics, mark inactive sessions
2. **Check DB watcher** — verify `pgrep -f "db-watcher.py"` is running; if not, run `startup.sh`
3. Check email (cron handles this separately)
4. Check TODO.md — pick next uncompleted task and work on it for 10+ minutes
5. If no progress since last heartbeat, explain why and fix it

## Self-Check
- Did I do something productive since the last heartbeat?
- If not: pick the highest priority TODO item and start immediately
- Don't just check boxes — produce something real (a file, a finding, a commit)

## After Completing Work
1. **Validate** — verify the result actually works/makes sense
2. **Commit** — git add + commit with descriptive message
3. **Push** — git push to GitHub (papperpopper/nimbus)
4. **Update TODO.md** — mark items done, add new items discovered

## Daily Email Summary (~08:00 UTC / 09:00 CET)
- Send nimbus@studio306.nl → zsolt@studio306.nl
- Subject: "Nimbus Daily — YYYY-MM-DD"
- Content: what was done, git commit references, next priorities
- Keep it concise — bullet points, not essays
