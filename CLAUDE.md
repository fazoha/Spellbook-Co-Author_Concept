# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project context

Spellbook Co-Author is a real-time collaborative contract editing MVP built for an interview at Spellbook (a legal AI company). The core concept is git-style document collaboration (branch, review, merge) expressed in non-technical language for legal teams, combined with automatic AI clause analysis.

The live app is at Vercel. The collab server runs on Railway. Both auto-deploy on push to `main`.

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
The server loads it via `config({ path: '../.env' })`. Railway and Vercel use their own variable dashboards — never commit `.env`.

Frontend reads `VITE_COLLAB_URL` for the server base URL (defaults to `http://localhost:3030`). Set this in Vercel's environment variables.

## Architecture

```
Browser (React + TypeScript + Vite)
    ↕ WebSocket (Socket.io)    ↕ HTTP fetch
Node.js collab server (server/index.js)
    ↕ OpenAI API
```

### Document model (`src/document.ts`)
The intellectual core of the project. All merge logic lives here — no UI, pure functions:
- `getChangedSectionIds()` — detects which sections differ between official and working copy
- `computeUpdateToLatest()` — 3-way merge: base (branch point) vs official (current) vs working (user edits). Returns merged sections + any `SectionOverlap[]` where both sides changed the same section
- `mergeOfficialWithDecisions()` — applies accept/reject decisions to produce a new official version
- `applyOverlapResolutions()` — resolves conflicts after user chooses keep official / keep mine per section

Document states: `official` (no status field) → `working copy (editing)` → `working copy (in_review)` → back to `official` after Make Official.

### Real-time layer (`src/realtime/useCollaboration.ts`)
Socket.io hook. Emits: `create_room`, `join_room`, `official_push`, `submit_collab_review`, `owner_resolve_review`. Listens for: `room_created`, `room_joined`, `official_updated`, `pending_reviews`, `room_snapshot`, `room_closed`. Rooms are in-memory on the server (lost on restart).

### App state (`src/App.tsx`)
Single source of truth. Key state:
- `officialDocuments[]` — up to 3 loaded documents
- `sessions` — per-workspace object containing `workingDocument`, `saveUpdateNote`, `acceptedSectionIds`, `rejectedSectionIds`, `rebaseSession`
- `annotations` — AI scan results (type `Annotation[]` from `DocumentViewer.tsx`)
- Auto-scan fires via `useEffect` on `officialDocument` change, 800ms debounced, calls `POST /api/scan-document`

### Server (`server/index.js`)
Plain Node.js HTTP + Socket.io, no framework. Three AI endpoints:
- `POST /api/scan-document` — scans all sections, returns `{ annotations: [{sectionId, quote, issue, suggestion}] }`
- `POST /api/merge-sections` — merges two conflicting versions of a section, returns `{ merged: string }`
- `POST /api/coauthor` — on-demand single-section review, returns `{ markdown }` (legacy, kept for reference)

CORS is open (`origin: true`). The `PORT` env var must be set to `3030` in Railway to match the domain target port.

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

## All gaps complete — no known remaining gaps.

## Commit convention

Always include at the end of commit messages:
```
Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```
Always run `npm run build` before committing. Never push a broken build.
