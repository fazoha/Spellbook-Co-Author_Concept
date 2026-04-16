# src — Core Logic Reference

## App.tsx — State & wiring

Single source of truth. Key state:

| State | Purpose |
|-------|---------|
| `officialDocuments[]` | Up to 3 loaded official documents |
| `sessions` | Per-workspace: `workingDocument`, `saveUpdateNote`, `acceptedSectionIds`, `rejectedSectionIds`, `rebaseSession` |
| `annotations` | AI scan results, auto-cleared when applied/dismissed |
| `collabDisplayName` | Current user's display name — shared between `DocumentUploadGate` (join form) and `CollabPanel` (create/join form). Shown in header when `collab.status === 'in_room'` |
| `soloMode` | `collab.status === 'idle'` — true when not in any room |
| `officialHistory` | `Record<string, OfficialVersionSnapshot[]>` — per-workspace list of past official versions, populated by `saveOfficialSnapshot()` on every Make Official |
| `historyViewingVersion` | Currently selected past version snapshot, or `null` for live document. When set, main area is read-only and sidebar is disabled |

### Solo vs collab workflow
- **Solo** (`soloMode = true`): Start Working → edit → Make Official directly. "Send for Review" hidden. `handleMakeOfficial` has a solo branch that accepts all changed sections without a review step.
- **Collab owner**: Auto-gets a working copy when room is created. Make Official publishes to room via `collab.pushOfficial()`.
- **Collab editor**: Start Working → edit → Submit to owner. "Make Official" hidden. After submission, working copy is cleared.

### handleApplyAnnotation
If no working copy exists when user applies an AI suggestion, one is auto-created from the official document (same as clicking Start Working). Only works when status is `editing`; blocked if `in_review`.

### collabDisplayName threading
`App.tsx` → `DocumentUploadGate.joinCollaboration.joinName` (editor join flow)
`App.tsx` → `CollabPanel.displayName` (owner create flow)
`App.tsx` → `MainDocumentArea.collabDisplayName` → `WorkspaceHeader.displayName`

## document.ts — Merge logic (pure functions)

- `getChangedSectionIds(official, working)` — sections that differ
- `computeUpdateToLatest(official, working)` — 3-way merge returning `{ mergedSections, overlaps: SectionOverlap[] }`
- `mergeOfficialWithDecisions(official, working, acceptedIds)` — produces new official from accepted sections
- `applyOverlapResolutions(draftSections, overlaps, resolutions, combinedTexts?)` — resolves conflicts after user chooses `'official'` | `'mine'` | `'combined'` per section. `combinedTexts` maps sectionId → AI-merged text for `'combined'` resolutions.
- `submitWorkingDocumentForReview(working)` — transitions status to `'in_review'`

## docxImport.ts — Document import

Uses mammoth.js. Splits into sections by H1/H2/H3 Word heading styles.

### Splitting logic (three modes)

1. **Multiple H1s** → H1 = section boundary, H2/H3 folded into parent body (e.g. Services Agreement)
2. **Single H1 + H2s** → H1 is decorative title (skipped), H2 = section boundary (e.g. Lease Agreement)
3. **No H1/H2/H3** → implicit detection on `<p>` elements:
   - `NUMBERED_CLAUSE_RE = /^\d+\.\s+\S/` — "1. Services", NOT "1.1 Sub-clause"
   - ALL-CAPS lines: ≥3 chars, ≤80 chars, no lowercase
   - Fully bold paragraphs: ≥90% wrapped in `<strong>`/`<b>`, ≤80 chars

Key variables: `titleOnlyH1 = h1Elements.length === 1 && h2Elements.length > 0`, `effectiveBoundaryTag = titleOnlyH1 ? 'H2' : 'H1'`

## realtime/useCollaboration.ts — Socket.io hook

Emits: `create_room`, `join_room`, `official_push`, `submit_collab_review`, `owner_resolve_review`
Listens: `room_created`, `room_joined`, `official_updated`, `pending_reviews`, `room_snapshot`, `room_closed`

Rooms are **in-memory** on the server — lost on server restart.
