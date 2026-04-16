# Spellbook Co-Author — Progress Log

## All Gaps Complete ✅

| Gap | Fix | Files changed |
|-----|-----|---------------|
| Gap 7 | Editors can't upload docs | `WorkflowActionPanel.tsx` — `{!collabEditorInRoom && <upload button>}` |
| Gap 3 | AI flag card collapse (× button) | `DocumentViewer.tsx` — `AnnotationCard` got `onClose` prop + × button in header |
| Gap 5 | Username/role badge in header | `WorkspaceHeader.tsx` (displayName + role props), `CollabPanel.tsx` (controlled name), `DocumentUploadGate.tsx` (controlled joinName), `App.tsx` (collabDisplayName state) |
| Gap 1 | No Send for Review in solo mode | `App.tsx` (`soloMode = collab.status === 'idle'`), `WorkflowActionPanel.tsx` (soloMode prop, mergeReviewOpen includes solo editing) |
| Gap 6 | AI suggestion auto-creates working copy | `App.tsx` — `handleApplyAnnotation` creates working copy from official if none exists |
| Gap 4 | Document section splitting | `src/docxImport.ts` — three-mode heading detection |
| Gap 2 | "Combine Both (AI)" in overlap resolution | `server/index.js` (`handleMergeSections`), `src/document.ts` (`applyOverlapResolutions`), `src/components/MainDocumentArea.tsx` (`RebaseSessionState`), `src/components/RebaseOverlapView.tsx` (new button + loading state), `src/App.tsx` (`handleRebaseCombinedText`, wiring) |
| Polish | Revert to original in line diff box | `src/components/DocumentViewer.tsx` — two-step confirm button inside the diff box, calls `onBodyChange(id, baseSection.body)` |
| Polish | Hide server URL from UI | `src/components/CollabPanel.tsx` — removed Server URL label/input; `src/App.tsx` — removed `serverUrl`/`onServerUrlChange` props from `CollabPanel` call site; `src/components/DocumentUploadGate.tsx` — removed Server URL field from join form; cleaned up dev-jargon subtitle text |
| Polish | Clean up CollabPanel dev jargon | `src/components/CollabPanel.tsx` — removed "npm run collab" text, removed "MVP: up to 3 people per room" text, removed "Host syncs…" footer; removed unused `officialForRoom` prop from type + call site in `App.tsx` |
| Polish | Remove "Up to 3 files (MVP)" from Open Documents | `src/components/WorkflowActionPanel.tsx` — removed capacity/MVP prefix from description text |
| Polish | Remove redundant Review Requests section | `src/components/WorkflowActionPanel.tsx` — removed static "Review requests" block (empty state + list); the dynamic one in CollabPanel remains |
| Feature | Functional version history in Saved Updates | `src/components/WorkflowActionPanel.tsx` — `SavedUpdateCard` with Current badge, restore expand, delete confirm; `src/App.tsx` — `handleRestoreSavedUpdate`, `handleDeleteSavedUpdate`, `handleDiscardWorkingCopy` |
| Feature | Official version history (History button) | `src/document.ts` (`OfficialVersionSnapshot` type), `src/App.tsx` (`officialHistory` + `historyViewingVersion` state, `saveOfficialSnapshot` in all Make Official paths), `src/components/WorkspaceHeader.tsx` (History button + dropdown), `src/components/MainDocumentArea.tsx` (past-version banner + read-only mode), `src/components/WorkflowActionPanel.tsx` (`viewingHistory` overlay) |
