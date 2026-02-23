# Mac Studio Remote Exec Standard (SSH)

## Goal
Avoid shell quoting/syntax failures (especially `/bin/bash: ... unexpected token '('`) by using **script files**, not long inline one-liners.

---

## Standard Pattern

### 1) For shell logic: write a temp script on remote and run it
```bash
ssh studiokallos 'cat > /tmp/task.sh <<"SH"
#!/bin/bash
set -euo pipefail
# commands...
SH
chmod +x /tmp/task.sh
/tmp/task.sh'
```

### 2) For Python: write a temp `.py` and run it
```bash
ssh studiokallos 'cat > /tmp/task.py <<"PY"
import json
# python code...
PY
python3 /tmp/task.py'
```

### 3) For single short checks only, `python3 -c` is allowed
Use only if expression is short and quote-safe.

---

## Mandatory Rules

1. Use `set -euo pipefail` in all remote shell scripts.
2. Never embed Python tuples/lists/dicts directly inside long `bash -c` strings.
3. Use absolute paths in scripts.
4. Print section markers (`== STEP ==`) for readable logs.
5. Keep each script focused (one task group).
6. For risky edits, print before/after key fields.

---

## Error Handling

- If a step is best-effort, append `|| true` only to that exact command.
- Do not wrap the entire script in best-effort mode.
- On failure, return:
  - failing step
  - exact stderr
  - whether prior steps already applied

---

## Recommended Script Names

- `/tmp/mac_hook_check.sh`
- `/tmp/mac_router_fix.sh`
- `/tmp/mac_embed_check.sh`
- `/tmp/mac_db_health.py`

---

## Cleanup

Optional after success:
```bash
rm -f /tmp/task.sh /tmp/task.py
```

(Keep temporarily if audit trail/debugging is needed.)
