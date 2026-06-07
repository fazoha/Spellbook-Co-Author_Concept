# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project context

Spellbook Co-Author is a real-time collaborative contract editing MVP built for an interview at Spellbook (a legal AI company). The core concept is git-style document collaboration (branch, review, merge) expressed in non-technical language for legal teams, combined with automatic AI clause analysis.

The entire stack runs on AWS. Both the frontend and backend auto-deploy on push to `main` via GitHub Actions.

**Live URLs:**
- Frontend: `https://d3kpeh8q49zq3j.cloudfront.net` (CloudFront → S3)
- Backend: `http://coauthor-alb-862972696.us-east-1.elb.amazonaws.com` (ALB → ECS Fargate)
- ECR: `448047749558.dkr.ecr.us-east-1.amazonaws.com/coauthor-backend`

## Commands

```bash
# Install (must install both root and server separately)
npm install
npm install --prefix server

# Local development
npm run dev:full      # collab server (port 3030) + one Vite instance (port 5173)
npm run dev:double    # collab server + two instances (5174, 5175) — for collab testing
npm run dev:triple    # collab server + three instances (5174, 5175, 5176)

# Build (run before every commit to catch TS errors)
npm run build

# Kill a stuck port
lsof -i :3030 | grep LISTEN | awk '{print $2}' | xargs kill
```

Environment: create `.env` in project root (not in `server/`):
```
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4o-mini
```
The server loads it via `config({ path: '../.env' })`. Never commit `.env`.

Frontend reads `VITE_COLLAB_URL` for the server base URL (defaults to `http://localhost:3030`). In production this is set via the `VITE_COLLAB_URL` GitHub Actions secret and baked into the build at deploy time.

## Architecture

```
GitHub push to main
    ↓ GitHub Actions (2 workflows)
    ├── build → S3 sync → CloudFront invalidation   (frontend)
    └── Docker build → ECR push → ECS update         (backend)

Browser → CloudFront (HTTPS) → S3 (static assets)
Browser → ALB (HTTP + WebSocket upgrade) → ECS Fargate task (port 3030)
ECS task → OpenAI API (merge-sections, coauthor)
ECS task → Lambda coauthor-scan-document → OpenAI API (scan)
ECS task → S3 coauthor-documents-farhan (upload / export)
```

### Document model (`src/document.ts`)
The intellectual core of the project. All merge logic lives here — no UI, pure functions:
- `getChangedSectionIds()` — detects which sections differ between official and working copy
- `computeUpdateToLatest()` — 3-way merge: base (branch point) vs official (current) vs working (user edits). Returns merged sections + any `SectionOverlap[]` where both sides changed the same section
- `mergeOfficialWithDecisions()` — applies accept/reject decisions to produce a new official version
- `applyOverlapResolutions()` — resolves conflicts after user chooses keep official / keep mine per section

Document states: `official` (no status field) → `working copy (editing)` → `working copy (in_review)` → back to `official` after Make Official.

### Real-time layer (`src/realtime/useCollaboration.ts`)
Socket.io hook. Emits: `create_room`, `join_room`, `official_push`, `submit_collab_review`, `owner_resolve_review`. Listens for: `room_created`, `room_joined`, `official_updated`, `pending_reviews`, `room_snapshot`, `room_closed`. Rooms are in-memory on the server (lost on restart). ECS desired_count is 1 — horizontal scaling requires Redis.

### App state (`src/App.tsx`)
Single source of truth. Key state:
- `officialDocuments[]` — up to 3 loaded documents
- `sessions` — per-workspace object containing `workingDocument`, `saveUpdateNote`, `acceptedSectionIds`, `rejectedSectionIds`, `rebaseSession`
- `annotations` — AI scan results (type `Annotation[]` from `DocumentViewer.tsx`)
- Auto-scan fires via `useEffect` on `officialDocument` change, 800ms debounced, calls `POST /api/scan-document`

### Server (`server/index.js`)
Plain Node.js HTTP + Socket.io, no framework. Five endpoints:
- `POST /api/scan-document` — invokes the `coauthor-scan-document` Lambda (which calls OpenAI), returns `{ annotations: [{sectionId, quote, issue, suggestion}] }`
- `POST /api/merge-sections` — merges two conflicting section versions via OpenAI, returns `{ merged: string }`
- `POST /api/coauthor` — on-demand single-section review, returns `{ markdown }` (legacy, kept for reference)
- `POST /api/upload-document` — accepts raw .docx bytes, uploads to S3 under `documents/<uuid>.docx`, returns `{ key }`
- `POST /api/export-document` — accepts `{ sections, documentTitle }`, builds a text file, uploads to S3 under `exports/<uuid>-<title>.txt`, returns a signed download URL `{ url, key }` (1 hour expiry)

CORS is open (`origin: true`). `PORT` env var is set to `3030` in the ECS task definition.

### Docker (`server/Dockerfile`)
Node 20 Alpine image. Always build for `linux/amd64` — Mac M-series produces ARM64 by default and ECS Fargate requires AMD64:
```bash
docker buildx build --platform linux/amd64 -t <tag> ./server
```
The GitHub Actions workflow handles this automatically via `docker buildx create --use`.

### CI/CD (`.github/workflows/`)

**`deploy-frontend.yml`** — triggers on changes to `src/**`, `public/**`, `index.html`, `vite.config.ts`, `package*.json`, `tsconfig*.json`:
1. `npm ci` + `npm run build` (injects `VITE_COLLAB_URL` from secret)
2. `aws s3 sync dist/ s3://$FRONTEND_BUCKET --delete`
3. `aws cloudfront create-invalidation --paths "/*"`

**`deploy-backend.yml`** — triggers on changes to `server/**`, `lambda/**`:
1. `docker buildx build --platform linux/amd64 -t $ECR_REGISTRY/coauthor-backend:latest --push ./server`
2. `aws ecs update-service --cluster coauthor-cluster --service coauthor-backend --force-new-deployment`

**Required GitHub Actions secrets** (Settings → Secrets and variables → Actions):
| Secret | Value |
|--------|-------|
| `AWS_ACCESS_KEY_ID` | IAM user `coauthor-dev-2` access key |
| `AWS_SECRET_ACCESS_KEY` | IAM user `coauthor-dev-2` secret key |
| `VITE_COLLAB_URL` | `http://coauthor-alb-862972696.us-east-1.elb.amazonaws.com` |
| `FRONTEND_BUCKET` | `coauthor-frontend-farhan` |
| `CLOUDFRONT_DISTRIBUTION_ID` | `E3K3YT9OV06KJO` |

### AWS infrastructure (`infrastructure/`)
Terraform-managed. State is local (not committed). To deploy changes:
```bash
cd infrastructure
export TF_VAR_openai_api_key=$(grep OPENAI_API_KEY ../.env | cut -d= -f2)
terraform apply
```
AWS account: `448047749558`, IAM user: `coauthor-dev-2`, region: `us-east-1`.

**Resources managed by Terraform:**

| Resource | Name | Purpose |
|----------|------|---------|
| S3 bucket | `coauthor-documents-farhan` | Document uploads + exports (versioning, AES-256) |
| S3 bucket | `coauthor-frontend-farhan` | Static site hosting for React build |
| CloudFront distribution | `E3K3YT9OV06KJO` | HTTPS CDN for frontend; SPA fallback (403/404 → index.html) |
| Lambda | `coauthor-scan-document` | Node.js 20.x, 30s timeout; invoked by ECS task via SDK |
| VPC | `10.0.0.0/16` | Networking for ECS + ALB |
| Subnets | `public_a` (us-east-1a), `public_b` (us-east-1b) | Two AZs required by ALB |
| ALB | `coauthor-alb` | Internet-facing; forwards HTTP + WebSocket to ECS on port 3030 |
| ECR repo | `coauthor-backend` | Docker image registry for the Node.js server |
| ECS cluster | `coauthor-cluster` | Fargate cluster |
| ECS task | `coauthor-backend` | 256 CPU / 512 MB; env vars: PORT, OPENAI_API_KEY, OPENAI_MODEL |
| ECS service | `coauthor-backend` | desired_count=1; registers with ALB target group |
| CloudWatch | `/ecs/coauthor-backend` | Container logs, 7-day retention |
| IAM | `coauthor-lambda-scan-role` | Lambda execution role |
| IAM | `coauthor-ecs-task-execution-role` | ECS pull-from-ECR role |
| IAM | `coauthor-ecs-task-role` | ECS runtime role (Lambda invoke + S3 read/write) |

### S3 file layout
- `documents/<uuid>.docx` — original uploaded files (set as `s3Key` on `DocumentModel`)
- `exports/<uuid>-<title>.txt` — exported document snapshots (signed URL returned to browser)

### Collab server URL
`collabServerUrl` is derived once in `App.tsx` from `import.meta.env.VITE_COLLAB_URL ?? 'http://localhost:3030'` and passed as a prop through to components that need it. It is **never shown in the UI** — the Server URL input was removed from both `CollabPanel.tsx` and `DocumentUploadGate.tsx`. In production, `VITE_COLLAB_URL` is set as a GitHub Actions secret and baked into the build.

### Document import (`src/docxImport.ts`)
Uses mammoth.js. Three-mode heading detection:
1. **Multiple H1s** → H1 = section boundary, H2/H3 folded into body
2. **Single H1 (title) + H2s** → H1 skipped as decorative title, H2 = section boundary (e.g. Commercial Lease Agreement)
3. **No H1/H2/H3** → implicit detection: numbered clauses (`/^\d+\.\s+\S/`), ALL-CAPS lines, fully-bold paragraphs

### AI annotation UI (`src/components/DocumentViewer.tsx`)
`AnnotatedTextarea` — renders a normal textarea with an absolutely-positioned overlay div. When a card is active, the textarea text becomes `color: transparent` and the overlay renders all text with amber highlight on the flagged quote. Shared `sharedStyle` object must keep font/padding in sync between textarea and overlay or text will misalign.

## Implemented fixes

- **Gap 1** — Hide "Send for Review" in solo mode: `soloMode = collab.status === 'idle'` in `App.tsx`; `WorkflowActionPanel` hides Send for Review; Make Official works directly from `editing` state in solo.
- **Gap 3** — AI flag card collapse: `AnnotationCard` in `DocumentViewer.tsx` got `onClose` prop + × button.
- **Gap 4** — Document section splitting: `src/docxImport.ts` three-mode detection (multiple H1s / single title H1 + H2s / implicit).
- **Gap 5** — Username/role badge in header: `collabDisplayName` lifted to `App.tsx`, flows into `WorkspaceHeader` via `MainDocumentArea`; role shows "Official Owner" or "Collaborator".
- **Gap 6** — AI suggestion auto-creates working copy: `handleApplyAnnotation` in `App.tsx` creates working copy if none exists.
- **Gap 7** — Block editors from uploading: `WorkflowActionPanel` wraps upload button in `{!collabEditorInRoom && ...}`.
- **Gap 2** — "Combine Both (AI)" in overlap resolution: `POST /api/merge-sections` on server calls OpenAI to merge two clause versions; `applyOverlapResolutions` in `document.ts` handles `'combined'` resolution type with a `combinedTexts` map; `RebaseOverlapView.tsx` has a third violet button with loading spinner; `RebaseSessionState` carries `combinedTexts`; `App.tsx` has `handleRebaseCombinedText` handler.

## Post-gap polish

- **Revert to original** — In `DocumentViewer.tsx`, the line diff box (shown while editing a section that differs from official) now has a two-step "Revert to original" button at the bottom. First click shows "Confirm revert?" + Cancel; second click calls `onBodyChange(id, baseSection.body)`, resetting the section to the official text and hiding the diff box.
- **Server URL hidden** — The Server URL input was removed from both `CollabPanel.tsx` and `DocumentUploadGate.tsx`. The URL is auto-derived from `VITE_COLLAB_URL` env var in `App.tsx` and is never shown to users. The join form subtitle was also cleaned up to remove dev-jargon (`npm run collab` reference).
- **CollabPanel dev jargon removed** — Removed "npm run collab" sentence, "MVP: up to 3 people per room" prefix, and "Host syncs…" footer from `CollabPanel.tsx`. The unused `officialForRoom` prop was fully removed from the type, destructure, and `App.tsx` call site.
- **"Up to 3 files (MVP)" removed** — In `WorkflowActionPanel.tsx`, the Open Documents description no longer mentions file capacity or MVP status.
- **Redundant Review Requests section removed** — The static "Review requests" block (with empty-state placeholder) in `WorkflowActionPanel.tsx` was removed. The functional incoming reviews UI in `CollabPanel.tsx` remains.
- **Functional version history** — Saved Updates cards in `WorkflowActionPanel.tsx` are now interactive. A `SavedUpdateCard` component handles: "Current" badge (sections compared via `sectionsMatch()`), click-to-expand restore flow ("Restore to this version" / "Cancel"), and per-card delete with inline confirm. Deleting the current card shows a stronger warning and calls `onDiscardWorkingCopy` which clears the entire working copy. All interactions are disabled when `in_review`. New handlers in `App.tsx`: `handleRestoreSavedUpdate`, `handleDeleteSavedUpdate`, `handleDiscardWorkingCopy`.
- **Official version history** — "History" button in `WorkspaceHeader.tsx` opens a dropdown listing all past official versions (most recent first) with timestamps. Clicking a past version switches the main document view to a read-only state showing that snapshot. A blue banner displays "You are viewing a past version from [date]" with a "Back to Current" button. The entire sidebar is disabled (overlay + pointer-events-none) while browsing history. Every `handleMakeOfficial` code path saves an `OfficialVersionSnapshot` to `officialHistory` state (per workspace). Selecting "Current Version" or clicking "Back to Current" exits history mode. History is cleared when switching workspaces. The `OfficialVersionSnapshot` type lives in `document.ts`.

## AWS / S3 features (Steps 6–10)

- **Step 6 — Lambda scan-document** — `POST /api/scan-document` now invokes `coauthor-scan-document` Lambda instead of calling OpenAI directly. Server uses `@aws-sdk/client-lambda` (`InvokeCommand`). Lambda code in `lambda/scanDocument.js` (CommonJS, native fetch, no deps). Terraform deploys it via `archive_file` data source.
- **Step 7 — Export button** — `WorkflowActionPanel.tsx` has an "Export document" button that calls `handleExportDocument` in `App.tsx`. Handler POSTs current sections to `/api/export-document`, receives a signed S3 URL, opens it in a new tab (`window.open`).
- **Step 8 — S3 upload on import** — Both `handleFirstDocumentLoaded` and `handleAddDocumentFile` in `App.tsx` call `uploadDocToS3(file, workspaceId)` after a successful parse. Upload is fire-and-forget (best-effort; failures are silent). The `DocumentUploadGate.onDocumentLoaded` callback now passes `(doc, file)` so the initial upload gate also triggers the S3 upload.
- **Step 9 — `s3Key` on `DocumentModel`** — Optional `s3Key?: string` field added to `DocumentModel` in `document.ts`. Set on the official document object when `/api/upload-document` returns successfully.
- **Step 10 — Terraform for Lambda** — `infrastructure/main.tf` has `aws_iam_role`, `aws_iam_role_policy_attachment`, and `aws_lambda_function` for `coauthor-scan-document`. `infrastructure/variables.tf` declares the `openai_api_key` sensitive variable. `infrastructure/outputs.tf` exports `lambda_function_name` and `lambda_function_arn`.

## Full AWS migration

Frontend migrated from Vercel to **S3 + CloudFront**. Backend migrated from Railway to **ECS Fargate + ALB**. CI/CD migrated from platform auto-deploys to **GitHub Actions**.

Key decisions:
- ECS desired_count=1 (in-memory Socket.io rooms cannot be load-balanced without Redis)
- Docker images must be built for `linux/amd64` (Mac M-series default is ARM64 which ECS rejects)
- ALB natively handles WebSocket upgrades — no special Socket.io config needed
- CloudFront custom error responses map 403/404 → 200 + index.html for React Router SPA routing
- OpenAI API key stored as plaintext env var in ECS task definition (acceptable for dev/MVP)

## No known remaining gaps or issues.

## Commit convention

Always include at the end of commit messages:
```
Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```
Always run `npm run build` before committing. Never push a broken build.
