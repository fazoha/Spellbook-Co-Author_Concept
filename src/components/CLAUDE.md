# src/components — Component Reference

## WorkspaceHeader.tsx
Top bar showing document title, version badge, and (when in a collab room) the current user's name + role badge.

Props:
- `documentTitle`, `versionLabel`, `badgeTone` — always required
- `displayName?: string` — user's display name (only shown when in a collab room)
- `role?: 'owner' | 'editor' | null` — renders "Official Owner" or "Collaborator" badge

The name + role section only renders when both `displayName` and `role` are non-null/non-empty.

## WorkflowActionPanel.tsx
Right sidebar. Key props that control visibility of action buttons:

| Prop | Effect |
|------|--------|
| `soloMode` | Hides "Send for Review"; enables Make Official directly from `editing` state |
| `collabEditorInRoom` | Hides "Send for Review", "Make Official", and "Upload another .docx" |
| `collabOwnerInRoom` | Hides "Start Working" and "Send for Review"; Make Official publishes to room |
| `hideMakeOfficial` | Explicitly hides Make Official (used for editors) |

`mergeReviewOpen` (internal) gates the Make Official button enabled state. It is true when:
- `inReview` (working copy is `in_review`)
- `collabOwnerReviewActive` (owner is reviewing an editor's submission)
- `collabOwnerHasUnpublishedEdits` (owner in room has unsaved edits)
- `soloMode && isEditing && isWorkingCopy` (solo user editing — can make official directly)

## DocumentViewer.tsx
Renders sections as annotated textareas with AI flag overlay.

**AnnotationCard** — side card for a single AI flag. Props: `annotation`, `onDismiss`, `onApply`, `onClose`.
- `onClose` collapses the card back to the pill (calls `setActiveAnnotation(null)` in `DocumentSection`)
- The annotation pill toggle: `setActiveAnnotation((prev) => (prev?.quote === a.quote ? null : a))` — clicking an active pill collapses it

**AnnotatedTextarea** — textarea + absolutely-positioned overlay div. `sharedStyle` object must stay in sync (font/padding) between textarea and overlay or text will misalign.

**Line diff box** — shown below each section textarea when the working copy body differs from the official. Contains `LineDiffPanels` (compact mode) plus a two-step **Revert to original** button at the bottom:
- First click: button label changes to "Confirm revert?" with a "Cancel" link
- Second click: calls `onBodyChange(id, baseSection.body)`, resetting the section and hiding the diff box
- Uses local `confirmingRevert: boolean` state inside `DocumentSection`

## CollabPanel.tsx
Live collaboration UI (create room / in-room view / incoming reviews).

- `displayName` / `onDisplayNameChange` — **controlled** props (lifted to App.tsx). No local name state.
- When in room, shows members list, room code, disconnect button
- Owner: shows incoming reviews from editors
- Editor: shows "Submit working copy to owner" section
- **Server URL input removed** — it was visible to users but they never needed to interact with it. The URL is passed in as a prop from `App.tsx` and used internally for API calls but not displayed. Also removed from `DocumentUploadGate.tsx` join form; join form subtitle cleaned of dev-jargon.
- **CollabPanel dev jargon removed** — "npm run collab" sentence, "MVP: up to 3 people per room" prefix, and "Host syncs…" footer all removed. `officialForRoom` prop fully deleted (type, destructure, and `App.tsx` call site).

## WorkflowActionPanel.tsx (additional polish)
- **"Up to 3 files (MVP)" removed** — Open Documents description text no longer mentions file capacity or MVP status.
- **Redundant Review Requests section removed** — The static "Review requests" block (empty-state + list) at the bottom of the panel was removed. The functional incoming reviews UI lives in `CollabPanel.tsx` and remains.
- **Functional version history** — Saved Updates list uses `SavedUpdateCard` component. Features: "Current" badge when live sections match a snapshot (`sectionsMatch()`), click-to-expand restore with "Restore to this version" / "Cancel", per-card delete icon with inline confirm. Deleting the current card shows a stronger warning and calls `onDiscardWorkingCopy`. All interactive controls disabled when `in_review`. New props: `currentSections`, `onRestoreSavedUpdate`, `onDeleteSavedUpdate`, `onDiscardWorkingCopy`.

## DocumentUploadGate.tsx
Initial screen shown before any document is loaded. Two panels: upload .docx and join a collab room.

The join form uses **controlled** `joinName`/`onJoinNameChange` from `JoinCollaborationGateProps` (not local state) so the name flows back to `collabDisplayName` in App.tsx and appears in the header after joining.

## RebaseOverlapView.tsx
Shown when an editor's working copy has sections that conflict with the updated official version.

Options per overlap: **Keep official** / **Keep mine** / **Combine Both (AI)**

**Combine Both (AI)** — calls `POST /api/merge-sections` with `{officialBody, mineBody, sectionTitle}`. Shows a per-section loading spinner while in flight. On success stores the merged text via `onCombinedText(sectionId, text)` and sets resolution to `'combined'`. Styled in violet to distinguish from the other two options.

Props:
- `resolutions: Record<string, 'official' | 'mine' | 'combined' | undefined>`
- `onChoose: (sectionId, choice: 'official' | 'mine' | 'combined') => void`
- `onCombinedText: (sectionId, text) => void`
- `coauthorApiBaseUrl?: string | null` — used for the merge-sections fetch
