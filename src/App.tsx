import { useCallback, useMemo, useState } from 'react'

import { LeftSidebar } from './components/LeftSidebar'
import { MainDocumentArea, type RebaseSessionState } from './components/MainDocumentArea'
import { WorkflowActionPanel } from './components/WorkflowActionPanel'
import { DocumentUploadGate } from './components/DocumentUploadGate'
import {
  appendSavedUpdate,
  applyOverlapResolutions,
  computeUpdateToLatest,
  getChangedSectionIds,
  mergeOfficialWithDecisions,
  submitWorkingDocumentForReview,
  updateSectionBody,
  type DocumentModel,
} from './document'

const MAX_DOCUMENTS = 3

type DocSession = {
  workingDocument: DocumentModel | null
  saveUpdateNote: string
  acceptedSectionIds: string[]
  rejectedSectionIds: string[]
  rebaseSession: RebaseSessionState | null
}

function emptySession(): DocSession {
  return {
    workingDocument: null,
    saveUpdateNote: '',
    acceptedSectionIds: [],
    rejectedSectionIds: [],
    rebaseSession: null,
  }
}

export default function App() {
  const [officialDocuments, setOfficialDocuments] = useState<DocumentModel[]>([])
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null)
  const [sessions, setSessions] = useState<Record<string, DocSession>>({})
  const [selectedRemovalIds, setSelectedRemovalIds] = useState<string[]>([])
  const [addMoreBusy, setAddMoreBusy] = useState(false)
  const [addMoreError, setAddMoreError] = useState<string | null>(null)

  const officialDocument = useMemo(
    () => officialDocuments.find((o) => o.workspaceId === activeWorkspaceId) ?? null,
    [officialDocuments, activeWorkspaceId],
  )

  const session = activeWorkspaceId
    ? (sessions[activeWorkspaceId] ?? emptySession())
    : emptySession()

  const workingDocument = session.workingDocument
  const saveUpdateNote = session.saveUpdateNote
  const acceptedSectionIds = session.acceptedSectionIds
  const rejectedSectionIds = session.rejectedSectionIds
  const rebaseSession = session.rebaseSession

  const workingStatus = workingDocument?.status

  const patchSession = useCallback((workspaceId: string, patch: Partial<DocSession>) => {
    setSessions((prev) => ({
      ...prev,
      [workspaceId]: { ...(prev[workspaceId] ?? emptySession()), ...patch },
    }))
  }, [])

  const isWorkingCopy = workingDocument !== null

  const activeDocument: DocumentModel | null =
    officialDocument === null ? null : isWorkingCopy ? workingDocument! : officialDocument

  const rebaseOpen = rebaseSession !== null
  const documentReadOnly = !isWorkingCopy || workingStatus === 'in_review' || rebaseOpen

  const isOfficialNewerThanBranch =
    officialDocument !== null &&
    isWorkingCopy &&
    workingStatus === 'editing' &&
    workingDocument!.basedOnVersionId !== undefined &&
    officialDocument.versionId !== undefined &&
    workingDocument!.basedOnVersionId !== officialDocument.versionId

  const changedSectionIds =
    isWorkingCopy && workingDocument && officialDocument
      ? getChangedSectionIds(officialDocument, workingDocument)
      : []

  const allChangedSectionsDecided =
    changedSectionIds.length === 0 ||
    changedSectionIds.every(
      (id) => acceptedSectionIds.includes(id) || rejectedSectionIds.includes(id),
    )

  function handleFirstDocumentLoaded(doc: DocumentModel) {
    const wid = doc.workspaceId
    if (!wid) return
    setOfficialDocuments([doc])
    setSessions({ [wid]: emptySession() })
    setActiveWorkspaceId(wid)
    setSelectedRemovalIds([])
  }

  async function handleAddDocumentFile(file: File) {
    if (officialDocuments.length >= MAX_DOCUMENTS) return
    setAddMoreError(null)
    setAddMoreBusy(true)
    try {
      const { importDocxFromFile } = await import('./docxImport')
      const doc = await importDocxFromFile(file)
      const wid = doc.workspaceId
      if (!wid) return
      setOfficialDocuments((prev) => [...prev, doc])
      setSessions((prev) => ({ ...prev, [wid]: emptySession() }))
      setActiveWorkspaceId(wid)
      setSelectedRemovalIds([])
    } catch (e) {
      setAddMoreError(e instanceof Error ? e.message : 'Could not read this file.')
    } finally {
      setAddMoreBusy(false)
    }
  }

  function handleToggleRemoval(workspaceId: string) {
    setSelectedRemovalIds((prev) =>
      prev.includes(workspaceId) ? prev.filter((x) => x !== workspaceId) : [...prev, workspaceId],
    )
  }

  function handleRemoveSelected() {
    const ids = selectedRemovalIds
    if (ids.length === 0) return
    setOfficialDocuments((prev) => {
      const next = prev.filter((o) => !o.workspaceId || !ids.includes(o.workspaceId))
      setActiveWorkspaceId((cur) => {
        if (!cur || !ids.includes(cur)) return cur
        return next[0]?.workspaceId ?? null
      })
      return next
    })
    setSessions((prev) => {
      const n = { ...prev }
      ids.forEach((id) => {
        delete n[id]
      })
      return n
    })
    setSelectedRemovalIds([])
  }

  function handleStartWorking() {
    if (!activeWorkspaceId || !officialDocument || isWorkingCopy) return
    patchSession(activeWorkspaceId, {
      workingDocument: {
        sections: structuredClone(officialDocument.sections),
        savedUpdates: [],
        status: 'editing',
        reviewRequests: [],
        basedOnVersionId: officialDocument.versionId!,
        branchBaseSections: structuredClone(officialDocument.sections),
        documentTitle: officialDocument.documentTitle,
        workspaceId: officialDocument.workspaceId,
      },
      acceptedSectionIds: [],
      rejectedSectionIds: [],
      rebaseSession: null,
    })
  }

  function handleSectionBodyChange(sectionId: string, body: string) {
    if (!activeWorkspaceId) return
    setSessions((prev) => {
      const s = prev[activeWorkspaceId] ?? emptySession()
      if (!s.workingDocument) return prev
      return {
        ...prev,
        [activeWorkspaceId]: {
          ...s,
          workingDocument: updateSectionBody(s.workingDocument, sectionId, body),
        },
      }
    })
  }

  function handleSaveUpdate() {
    if (!activeWorkspaceId) return
    setSessions((prev) => {
      const s = prev[activeWorkspaceId] ?? emptySession()
      if (!s.workingDocument) return prev
      return {
        ...prev,
        [activeWorkspaceId]: {
          ...s,
          workingDocument: appendSavedUpdate(s.workingDocument, s.saveUpdateNote),
          saveUpdateNote: '',
        },
      }
    })
  }

  function handleSendForReview() {
    if (!activeWorkspaceId) return
    setSessions((prev) => {
      const s = prev[activeWorkspaceId] ?? emptySession()
      if (!s.workingDocument || s.workingDocument.status !== 'editing') return prev
      return {
        ...prev,
        [activeWorkspaceId]: {
          ...s,
          workingDocument: submitWorkingDocumentForReview(s.workingDocument),
          acceptedSectionIds: [],
          rejectedSectionIds: [],
          rebaseSession: null,
        },
      }
    })
  }

  function handleAcceptSection(sectionId: string) {
    if (!activeWorkspaceId) return
    setSessions((prev) => {
      const s = prev[activeWorkspaceId] ?? emptySession()
      return {
        ...prev,
        [activeWorkspaceId]: {
          ...s,
          rejectedSectionIds: s.rejectedSectionIds.filter((id) => id !== sectionId),
          acceptedSectionIds: s.acceptedSectionIds.includes(sectionId)
            ? s.acceptedSectionIds
            : [...s.acceptedSectionIds, sectionId],
        },
      }
    })
  }

  function handleRejectSection(sectionId: string) {
    if (!activeWorkspaceId) return
    setSessions((prev) => {
      const s = prev[activeWorkspaceId] ?? emptySession()
      return {
        ...prev,
        [activeWorkspaceId]: {
          ...s,
          acceptedSectionIds: s.acceptedSectionIds.filter((id) => id !== sectionId),
          rejectedSectionIds: s.rejectedSectionIds.includes(sectionId)
            ? s.rejectedSectionIds
            : [...s.rejectedSectionIds, sectionId],
        },
      }
    })
  }

  function handleMakeOfficial() {
    if (!activeWorkspaceId || !officialDocument || !workingDocument || workingStatus !== 'in_review') return
    if (!allChangedSectionsDecided) return

    const merged = mergeOfficialWithDecisions(officialDocument, workingDocument, new Set(acceptedSectionIds))
    setOfficialDocuments((prev) =>
      prev.map((o) => (o.workspaceId === activeWorkspaceId ? merged : o)),
    )
    patchSession(activeWorkspaceId, {
      workingDocument: null,
      saveUpdateNote: '',
      acceptedSectionIds: [],
      rejectedSectionIds: [],
      rebaseSession: null,
    })
  }

  function handleUpdateToLatest() {
    if (!activeWorkspaceId || !officialDocument || !workingDocument || workingStatus !== 'editing') return
    if (workingDocument.basedOnVersionId === officialDocument.versionId) return

    const { mergedSections, overlaps } = computeUpdateToLatest(officialDocument, workingDocument)

    if (overlaps.length === 0) {
      patchSession(activeWorkspaceId, {
        workingDocument: {
          ...workingDocument,
          sections: mergedSections,
          basedOnVersionId: officialDocument.versionId!,
          branchBaseSections: structuredClone(officialDocument.sections),
        },
        rebaseSession: null,
      })
      return
    }

    patchSession(activeWorkspaceId, {
      rebaseSession: {
        overlaps,
        draftSections: mergedSections,
        resolutions: {},
      },
    })
  }

  function handleRebaseChoose(sectionId: string, choice: 'official' | 'mine') {
    if (!activeWorkspaceId) return
    setSessions((prev) => {
      const s = prev[activeWorkspaceId] ?? emptySession()
      if (!s.rebaseSession) return prev
      return {
        ...prev,
        [activeWorkspaceId]: {
          ...s,
          rebaseSession: {
            ...s.rebaseSession,
            resolutions: { ...s.rebaseSession.resolutions, [sectionId]: choice },
          },
        },
      }
    })
  }

  function handleDemoBumpOfficial() {
    if (!import.meta.env.DEV || !activeWorkspaceId) return
    setOfficialDocuments((prev) =>
      prev.map((o) => {
        if (o.workspaceId !== activeWorkspaceId) return o
        const firstId = o.sections[0]?.id
        return {
          ...o,
          versionId: crypto.randomUUID(),
          sections: o.sections.map((s) =>
            s.id === firstId ? { ...s, body: `${s.body} [Parallel official change.]` } : s,
          ),
        }
      }),
    )
  }

  function handleApplyRebaseMerge() {
    if (!activeWorkspaceId || !rebaseSession || !workingDocument) return
    const { overlaps, draftSections, resolutions } = rebaseSession
    const allChosen = overlaps.every((o) => resolutions[o.sectionId] !== undefined)
    if (!allChosen || !officialDocument) return

    const finalSections = applyOverlapResolutions(
      draftSections,
      overlaps,
      resolutions as Record<string, 'official' | 'mine'>,
    )

    patchSession(activeWorkspaceId, {
      workingDocument: {
        ...workingDocument,
        sections: finalSections,
        basedOnVersionId: officialDocument.versionId!,
        branchBaseSections: structuredClone(officialDocument.sections),
      },
      rebaseSession: null,
    })
  }

  if (officialDocuments.length === 0) {
    return (
      <div className="flex h-screen min-h-0 bg-white font-sans text-gray-800 antialiased">
        <LeftSidebar />
        <DocumentUploadGate onDocumentLoaded={handleFirstDocumentLoaded} />
      </div>
    )
  }

  if (!officialDocument || !activeDocument) {
    return (
      <div className="flex h-screen min-h-0 bg-white font-sans text-gray-800 antialiased">
        <LeftSidebar />
        <div className="flex flex-1 items-center justify-center text-sm text-gray-600">
          Select a document in the panel.
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen min-h-0 bg-white font-sans text-gray-800 antialiased">
      <LeftSidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1">
          <MainDocumentArea
            officialDocument={officialDocument}
            activeDocument={activeDocument}
            isWorkingCopy={isWorkingCopy}
            workingStatus={workingStatus}
            readOnly={documentReadOnly}
            onSectionBodyChange={handleSectionBodyChange}
            acceptedSectionIds={acceptedSectionIds}
            rejectedSectionIds={rejectedSectionIds}
            onAcceptSection={handleAcceptSection}
            onRejectSection={handleRejectSection}
            isOfficialNewerThanBranch={Boolean(isOfficialNewerThanBranch)}
            onUpdateToLatest={handleUpdateToLatest}
            rebaseSession={rebaseSession}
            onRebaseChoose={handleRebaseChoose}
            onApplyRebaseMerge={handleApplyRebaseMerge}
          />
          <WorkflowActionPanel
            documents={officialDocuments}
            activeWorkspaceId={activeWorkspaceId!}
            maxDocuments={MAX_DOCUMENTS}
            selectedRemovalIds={selectedRemovalIds}
            onToggleRemoval={handleToggleRemoval}
            onSelectWorkspace={setActiveWorkspaceId}
            onAddDocumentFile={handleAddDocumentFile}
            addMoreBusy={addMoreBusy}
            addMoreError={addMoreError}
            onDismissAddMoreError={() => setAddMoreError(null)}
            onRemoveSelected={handleRemoveSelected}
            isWorkingCopy={isWorkingCopy}
            workingStatus={workingStatus}
            saveUpdateNote={saveUpdateNote}
            onSaveUpdateNoteChange={(value) => {
              if (activeWorkspaceId) patchSession(activeWorkspaceId, { saveUpdateNote: value })
            }}
            onStartWorking={handleStartWorking}
            onSaveUpdate={handleSaveUpdate}
            onSendForReview={handleSendForReview}
            onMakeOfficial={handleMakeOfficial}
            canMakeOfficial={workingStatus === 'in_review' && allChangedSectionsDecided}
            onUpdateToLatest={handleUpdateToLatest}
            showUpdateToLatest={Boolean(isOfficialNewerThanBranch) && !rebaseOpen}
            onDemoBumpOfficial={handleDemoBumpOfficial}
            savedUpdates={workingDocument?.savedUpdates ?? []}
            reviewRequests={workingDocument?.reviewRequests ?? []}
          />
        </div>
      </div>
    </div>
  )
}
