# GCP Access Isolation for Mac Studio (Dedicated Service Account)

## Goal
Restrict Mac Studio automation to **one Google Cloud project only** (e.g. `openclaw-studiokallos`) while keeping control clean and auditable.

---

## Key Principle
User OAuth credentials (normal Gmail login in `gcloud`) can potentially access any project where that user has IAM permissions.

To isolate properly:
1. Use a **dedicated service account** for automation.
2. Grant it roles **only in the target project**.
3. Remove broad user/project IAM access where not needed.

---

## Recommended Model

### 1) Create dedicated service account in target project
Example name:
- `openclaw-runtime@openclaw-studiokallos.iam.gserviceaccount.com`

### 2) Grant least-privilege roles only in target project
Typical roles (adjust to actual needs):
- Pub/Sub publisher/subscriber (only if needed)
- Logging viewer/writer
- Secret Manager accessor (if needed)
- Any custom minimal role required by OpenClaw integration

Do **not** grant Owner unless absolutely necessary.

### 3) Remove this identity from other projects
For strict isolation, ensure this service account has no roles outside target project.

### 4) Use service-account auth on Mac Studio runtime
Use this service account for automated commands/workers instead of personal Gmail OAuth where possible.

---

## What this solves
- Prevents accidental access to unrelated KallosSoft projects from automation runtime.
- Makes access boundary explicit and auditable.
- Simplifies incident response and credential rotation.

---

## About transferring projects between Gmail accounts
Possible in practice via IAM transition:
1. Add new account with high-enough role (e.g. Owner) on the project.
2. Move billing access/ownership as needed.
3. Validate all required permissions under new account.
4. Remove old account roles.

Notes:
- Organization policy may restrict role grants/transfers.
- There is no single “transfer project” button; it is an IAM + billing handover process.

---

## Operational checklist (short)
- [ ] Confirm exact target project ID.
- [ ] Create dedicated service account in that project.
- [ ] Apply least-privilege roles.
- [ ] Verify service account has no IAM bindings in other projects.
- [ ] Update Mac Studio runtime to authenticate with this account.
- [ ] Test required workflows (Pub/Sub, hooks, etc.).
- [ ] Remove unnecessary user-based broad access.
