import { useState } from 'react'

import { LeftSidebar } from './components/LeftSidebar'
import { MainDocumentArea, type RebaseSessionState } from './components/MainDocumentArea'
import { WorkflowActionPanel } from './components/WorkflowActionPanel'
import {
  appendSavedUpdate,
  applyOverlapResolutions,
  computeUpdateToLatest,
  createInitialOfficialDocument,
  getChangedSectionIds,
  mergeOfficialWithDecisions,
  submitWorkingDocumentForReview,
  updateSectionBody,
  type DocumentModel,
} from './document'

export default function App() {
  const [officialDocument, setOfficialDocument] = useState<DocumentModel>(createInitialOfficialDocument)
  const [workingDocument, setWorkingDocument] = useState<DocumentModel | null>(null)
  const [saveUpdateNote, setSaveUpdateNote] = useState('')
  const [acceptedSectionIds, setAcceptedSectionIds] = useState<string[]>([])
  const [rejectedSectionIds, setRejectedSectionIds] = useState<string[]>([])
  const [rebaseSession, setRebaseSession] = useState<RebaseSessionState | null>(null)

  const isWorkingCopy = workingDocument !== null
  const workingStatus = workingDocument?.status

  const activeDocument = isWorkingCopy ? workingDocument! : officialDocument

  const rebaseOpen = rebaseSession !== null
  const documentReadOnly = !isWorkingCopy || workingStatus === 'in_review' || rebaseOpen

  const isOfficialNewerThanBranch =
    isWorkingCopy &&
    workingStatus === 'editing' &&
    workingDocument!.basedOnVersionId !== undefined &&
    officialDocument.versionId !== undefined &&
    workingDocument!.basedOnVersionId !== officialDocument.versionId

  const changedSectionIds =
    isWorkingCopy && workingDocument ? getChangedSectionIds(officialDocument, workingDocument) : []

  const allChangedSectionsDecided =
    changedSectionIds.length === 0 ||
    changedSectionIds.every(
      (id) => acceptedSectionIds.includes(id) || rejectedSectionIds.includes(id),
    )

  function handleStartWorking() {
    if (isWorkingCopy) return
    setWorkingDocument({
      sections: structuredClone(officialDocument.sections),
      savedUpdates: [],
      status: 'editing',
      reviewRequests: [],
      basedOnVersionId: officialDocument.versionId!,
      branchBaseSections: structuredClone(officialDocument.sections),
    })
    setAcceptedSectionIds([])
    setRejectedSectionIds([])
    setRebaseSession(null)
  }

  function handleSectionBodyChange(sectionId: string, body: string) {
    setWorkingDocument((prev) => {
      if (!prev) return prev
      return updateSectionBody(prev, sectionId, body)
    })
  }

  function handleSaveUpdate() {
    setWorkingDocument((prev) => {
      if (!prev) return prev
      return appendSavedUpdate(prev, saveUpdateNote)
    })
    setSaveUpdateNote('')
  }

  function handleSendForReview() {
    setWorkingDocument((prev) => {
      if (!prev || prev.status !== 'editing') return prev
      return submitWorkingDocumentForReview(prev)
    })
    setAcceptedSectionIds([])
    setRejectedSectionIds([])
    setRebaseSession(null)
  }

  function handleAcceptSection(sectionId: string) {
    setRejectedSectionIds((prev) => prev.filter((id) => id !== sectionId))
    setAcceptedSectionIds((prev) => (prev.includes(sectionId) ? prev : [...prev, sectionId]))
  }

  function handleRejectSection(sectionId: string) {
    setAcceptedSectionIds((prev) => prev.filter((id) => id !== sectionId))
    setRejectedSectionIds((prev) => (prev.includes(sectionId) ? prev : [...prev, sectionId]))
  }

  function handleMakeOfficial() {
    if (!workingDocument || workingStatus !== 'in_review') return
    if (!allChangedSectionsDecided) return

    const merged = mergeOfficialWithDecisions(officialDocument, workingDocument, new Set(acceptedSectionIds))
    setOfficialDocument(merged)
    setWorkingDocument(null)
    setAcceptedSectionIds([])
    setRejectedSectionIds([])
    setSaveUpdateNote('')
    setRebaseSession(null)
  }

  function handleUpdateToLatest() {
    if (!workingDocument || workingStatus !== 'editing') return
    if (workingDocument.basedOnVersionId === officialDocument.versionId) return

    const { mergedSections, overlaps } = computeUpdateToLatest(officialDocument, workingDocument)

    if (overlaps.length === 0) {
      setWorkingDocument({
        ...workingDocument,
        sections: mergedSections,
        basedOnVersionId: officialDocument.versionId!,
        branchBaseSections: structuredClone(officialDocument.sections),
      })
      setRebaseSession(null)
      return
    }

    setRebaseSession({
      overlaps,
      draftSections: mergedSections,
      resolutions: {},
    })
  }

  function handleRebaseChoose(sectionId: string, choice: 'official' | 'mine') {
    setRebaseSession((prev) => {
      if (!prev) return prev
      return { ...prev, resolutions: { ...prev.resolutions, [sectionId]: choice } }
    })
  }

  /** Dev-only: simulate another party publishing a new official version while you still have a branch */
  function handleDemoBumpOfficial() {
    if (!import.meta.env.DEV) return
    setOfficialDocument((prev) => ({
      ...prev,
      versionId: crypto.randomUUID(),
      sections: prev.sections.map((s) =>
        s.id === 'scope' ? { ...s, body: `${s.body} [Parallel official change.]` } : s,
      ),
    }))
  }

  function handleApplyRebaseMerge() {
    if (!rebaseSession || !workingDocument) return
    const { overlaps, draftSections, resolutions } = rebaseSession
    const allChosen = overlaps.every((o) => resolutions[o.sectionId] !== undefined)
    if (!allChosen) return

    const finalSections = applyOverlapResolutions(
      draftSections,
      overlaps,
      resolutions as Record<string, 'official' | 'mine'>,
    )

    setWorkingDocument({
      ...workingDocument,
      sections: finalSections,
      basedOnVersionId: officialDocument.versionId!,
      branchBaseSections: structuredClone(officialDocument.sections),
    })
    setRebaseSession(null)
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
            isWorkingCopy={isWorkingCopy}
            workingStatus={workingStatus}
            saveUpdateNote={saveUpdateNote}
            onSaveUpdateNoteChange={setSaveUpdateNote}
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
