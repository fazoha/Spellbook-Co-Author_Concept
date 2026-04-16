import { useRef, useState, type ReactNode } from 'react'

import type { DocumentModel, DocumentSectionData, SavedUpdate } from '../document'

type WorkflowActionPanelProps = {
  documents: DocumentModel[]
  activeWorkspaceId: string
  maxDocuments: number
  selectedRemovalIds: string[]
  onToggleRemoval: (workspaceId: string) => void
  onSelectWorkspace: (workspaceId: string) => void
  onAddDocumentFile: (file: File) => void | Promise<void>
  addMoreBusy: boolean
  addMoreError: string | null
  onDismissAddMoreError: () => void
  onRemoveSelected: () => void
  isWorkingCopy: boolean
  workingStatus: 'editing' | 'in_review' | undefined
  saveUpdateNote: string
  onSaveUpdateNoteChange: (value: string) => void
  onStartWorking: () => void
  onSaveUpdate: () => void
  onSendForReview: () => void
  onMakeOfficial: () => void
  canMakeOfficial: boolean
  /** Collab editors: owner merges remotely; hide Make Official entirely. */
  hideMakeOfficial?: boolean
  onUpdateToLatest: () => void
  showUpdateToLatest: boolean
  savedUpdates: SavedUpdate[]
  /** Live sections of the working document — used to detect which saved update is "current". */
  currentSections?: DocumentSectionData[]
  /** Restore the working document to the snapshot of a saved update. */
  onRestoreSavedUpdate?: (updateId: string) => void
  /** Delete a saved update from the list. */
  onDeleteSavedUpdate?: (updateId: string) => void
  /** Discard the entire working copy and return to the official document. */
  onDiscardWorkingCopy?: () => void
  /** Owner is merging a collaborator’s submission (live session). */
  collabOwnerReviewActive?: boolean
  /** Optional collaboration UI block (create/join room, members, incoming reviews). */
  collabSection?: ReactNode
  /** Editor in a live room: clarify that review goes to the official owner. */
  collabEditorInRoom?: boolean
  /** Session host: edits publish with Make Official; no Start working / Send for review. */
  collabOwnerInRoom?: boolean
  /** Host has section edits not yet merged into shared official. */
  collabOwnerHasUnpublishedEdits?: boolean
  /** Not in any collab room — solo workflow: no Send for Review needed. */
  soloMode?: boolean
}

function sectionsMatch(a: DocumentSectionData[], b: DocumentSectionData[]): boolean {
  if (a.length !== b.length) return false
  return a.every((s, i) => s.id === b[i].id && s.title === b[i].title && s.body === b[i].body)
}

function SavedUpdateCard({
  update,
  isCurrent,
  isEditing,
  isOnlySavedUpdate,
  onRestore,
  onDelete,
  onDiscardWorkingCopy,
}: {
  update: SavedUpdate
  isCurrent: boolean
  isEditing: boolean
  isOnlySavedUpdate: boolean
  onRestore?: (id: string) => void
  onDelete?: (id: string) => void
  onDiscardWorkingCopy?: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <li className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          disabled={!isEditing || isCurrent}
          onClick={() => { if (!isCurrent) setExpanded((p) => !p) }}
          className={`flex-1 text-left ${isEditing && !isCurrent ? 'cursor-pointer hover:opacity-80' : ''}`}
        >
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-900">{update.note}</p>
            {isCurrent && (
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                Current
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-500">{formatTime(update.timestamp)}</p>
        </button>
        {isEditing && !confirmDelete && (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="mt-0.5 shrink-0 rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
            title="Delete this version"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
              <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A1.75 1.75 0 0 0 9.25 1.5h-2.5A1.75 1.75 0 0 0 5 3.25Zm2.25-.75a.25.25 0 0 0-.25.25V4h2v-.75a.25.25 0 0 0-.25-.25h-2.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5A.75.75 0 0 1 9.95 6Z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>

      {/* Restore expand */}
      {expanded && isEditing && !isCurrent && (
        <div className="mt-2 flex items-center gap-2 border-t border-gray-100 pt-2">
          <button
            type="button"
            onClick={() => { onRestore?.(update.id); setExpanded(false) }}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            Restore to this version
          </button>
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="text-[11px] text-gray-500 underline hover:text-gray-700"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="mt-2 border-t border-red-100 pt-2">
          {isCurrent && isOnlySavedUpdate ? (
            <>
              <p className="text-[11px] leading-snug text-red-800">
                This will discard your current working copy and return you to the official version. This cannot be undone.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { onDiscardWorkingCopy?.(); setConfirmDelete(false) }}
                  className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-red-800 shadow-sm hover:bg-red-50"
                >
                  Discard working copy
                </button>
                <button type="button" onClick={() => setConfirmDelete(false)} className="text-[11px] text-gray-500 underline hover:text-gray-700">
                  Cancel
                </button>
              </div>
            </>
          ) : isCurrent ? (
            <>
              <p className="text-[11px] leading-snug text-red-800">
                This will discard your current working copy and return you to the official version. This cannot be undone.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { onDiscardWorkingCopy?.(); setConfirmDelete(false) }}
                  className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-red-800 shadow-sm hover:bg-red-50"
                >
                  Discard working copy
                </button>
                <button type="button" onClick={() => setConfirmDelete(false)} className="text-[11px] text-gray-500 underline hover:text-gray-700">
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-[11px] leading-snug text-amber-800">Remove this saved version?</p>
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { onDelete?.(update.id); setConfirmDelete(false) }}
                  className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-red-800 shadow-sm hover:bg-red-50"
                >
                  Delete
                </button>
                <button type="button" onClick={() => setConfirmDelete(false)} className="text-[11px] text-gray-500 underline hover:text-gray-700">
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </li>
  )
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}


export function WorkflowActionPanel({
  documents,
  activeWorkspaceId,
  maxDocuments,
  selectedRemovalIds,
  onToggleRemoval,
  onSelectWorkspace,
  onAddDocumentFile,
  addMoreBusy,
  addMoreError,
  onDismissAddMoreError,
  onRemoveSelected,
  isWorkingCopy,
  workingStatus,
  saveUpdateNote,
  onSaveUpdateNoteChange,
  onStartWorking,
  onSaveUpdate,
  onSendForReview,
  onMakeOfficial,
  canMakeOfficial,
  hideMakeOfficial = false,
  onUpdateToLatest,
  showUpdateToLatest,
  savedUpdates,
  currentSections,
  onRestoreSavedUpdate,
  onDeleteSavedUpdate,
  onDiscardWorkingCopy,
  collabOwnerReviewActive,
  collabSection,
  collabEditorInRoom,
  collabOwnerInRoom = false,
  collabOwnerHasUnpublishedEdits = false,
  soloMode = false,
}: WorkflowActionPanelProps) {
  const moreFileInputRef = useRef<HTMLInputElement>(null)
  const isEditing = workingStatus === 'editing'
  const canSendForReview = isWorkingCopy && isEditing
  const inReview = workingStatus === 'in_review'
  const mergeReviewOpen =
    inReview || Boolean(collabOwnerReviewActive) || Boolean(collabOwnerHasUnpublishedEdits) || (soloMode && isEditing && isWorkingCopy)
  const atDocLimit = documents.length >= maxDocuments
  const hasRemovalSelection = selectedRemovalIds.length > 0

  return (
    <aside className="flex min-h-0 w-64 shrink-0 flex-col border-l border-gray-200 bg-gray-50 lg:w-72">
      <div className="shrink-0 border-b border-gray-200 px-4 py-4">
        <h2 className="text-sm font-semibold text-gray-900">Next steps</h2>
        <p className="mt-1 text-xs text-gray-500">Move this document through your workflow.</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <div className="space-y-0">
        {collabOwnerInRoom ? null : (
          <div className="border-b border-gray-200 p-4">
            <button
              type="button"
              onClick={onStartWorking}
              disabled={isWorkingCopy}
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-left text-sm font-medium text-gray-900 shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:border-gray-100 disabled:bg-gray-100 disabled:text-gray-400"
            >
              Start Working
            </button>
          </div>
        )}
        <div className="space-y-3 border-b border-gray-200 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Open documents</h3>
          <p className="text-xs leading-snug text-gray-500">
            Click a name to work on it; check the box to mark it for removal.
          </p>
          <ul className="space-y-1.5" aria-label="Uploaded documents">
            {documents.map((doc) => {
              const id = doc.workspaceId
              if (!id) return null
              const title = doc.documentTitle ?? 'Document'
              const active = id === activeWorkspaceId
              const checked = selectedRemovalIds.includes(id)
              return (
                <li
                  key={id}
                  className={`flex items-start gap-2 rounded-lg border px-2 py-2 transition-colors ${
                    active ? 'border-blue-300 bg-blue-50/70' : 'border-gray-200 bg-white'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggleRemoval(id)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500/30"
                    aria-label={`Select “${title}” for removal`}
                  />
                  <button
                    type="button"
                    onClick={() => onSelectWorkspace(id)}
                    className="min-w-0 flex-1 text-left text-sm font-medium text-gray-900 hover:text-blue-800"
                  >
                    <span className="line-clamp-2">{title}</span>
                    {active ? (
                      <span className="mt-0.5 block text-[11px] font-normal text-blue-700">Active</span>
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ul>

          <input
            ref={moreFileInputRef}
            type="file"
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="sr-only"
            disabled={atDocLimit || addMoreBusy}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void Promise.resolve(onAddDocumentFile(f)).finally(() => {
                e.target.value = ''
              })
            }}
          />
          <div className="flex flex-col gap-2">
            {!collabEditorInRoom && (
            <button
              type="button"
              onClick={() => moreFileInputRef.current?.click()}
              disabled={atDocLimit || addMoreBusy}
              title={atDocLimit ? `Maximum ${maxDocuments} documents` : undefined}
              className="w-full rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-left text-sm font-semibold text-blue-900 shadow-sm transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
            >
              {addMoreBusy ? 'Reading file…' : atDocLimit ? `Limit reached (${maxDocuments})` : 'Upload another .docx'}
            </button>
            )}
            <button
              type="button"
              onClick={onRemoveSelected}
              disabled={!hasRemovalSelection}
              className="w-full rounded-lg border border-red-200 bg-white px-3 py-2.5 text-left text-sm font-semibold text-red-800 shadow-sm transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
            >
              Remove selected
            </button>
          </div>

          {addMoreError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
              <p>{addMoreError}</p>
              <button
                type="button"
                onClick={onDismissAddMoreError}
                className="mt-2 text-[11px] font-semibold text-red-900 underline"
              >
                Dismiss
              </button>
            </div>
          ) : null}
        </div>

        {collabSection ? <div className="border-b border-gray-200 px-4 py-2">{collabSection}</div> : null}

        <nav className="space-y-2 border-b border-gray-200 p-4" aria-label="Document actions">
          {isWorkingCopy && isEditing ? (
            <div className="space-y-2 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
              <label htmlFor="save-update-note" className="block text-xs font-medium text-gray-600">
                Describe this update
              </label>
              <input
                id="save-update-note"
                type="text"
                value={saveUpdateNote}
                onChange={(e) => onSaveUpdateNoteChange(e.target.value)}
                placeholder="e.g. Updated payment terms"
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <button
                type="button"
                onClick={onSaveUpdate}
                className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
              >
                Save Update
              </button>
            </div>
          ) : null}

          {showUpdateToLatest ? (
            <button
              type="button"
              onClick={onUpdateToLatest}
              className="w-full rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-left text-sm font-semibold text-amber-950 shadow-sm hover:bg-amber-100"
            >
              Update to Latest
            </button>
          ) : null}

          {collabEditorInRoom || collabOwnerInRoom || soloMode ? null : (
            <div>
              <button
                type="button"
                onClick={onSendForReview}
                disabled={!canSendForReview}
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-left text-sm font-medium text-gray-900 shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:border-gray-100 disabled:bg-gray-100 disabled:text-gray-400"
              >
                Send for Review
              </button>
            </div>
          )}

          {hideMakeOfficial ? null : (
            <button
              type="button"
              onClick={onMakeOfficial}
              disabled={!mergeReviewOpen || !canMakeOfficial}
              title={
                mergeReviewOpen && !canMakeOfficial
                  ? collabOwnerHasUnpublishedEdits
                    ? 'Edit the document to add changes before publishing'
                    : 'Accept or reject every changed section before merging'
                  : collabOwnerReviewActive
                    ? 'Applies accepted sections to the shared official document and notifies the room'
                    : collabOwnerInRoom && collabOwnerHasUnpublishedEdits
                      ? 'Publishes your edits to the shared official document for everyone in the room'
                      : undefined
              }
              className={`w-full rounded-lg border px-4 py-3 text-left text-sm font-semibold shadow-sm transition-colors disabled:cursor-not-allowed disabled:border-gray-100 disabled:bg-gray-100 disabled:text-gray-400 ${
                collabOwnerReviewActive
                  ? 'border-emerald-400 bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-gray-100 disabled:text-gray-400'
                  : 'border-gray-200 bg-white font-medium text-gray-900 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              {collabOwnerReviewActive ? 'Merge into official (notify room)' : 'Make Official'}
            </button>
          )}
        </nav>

        {isWorkingCopy ? (
          <div className="px-4 py-4">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Saved updates</h3>
              <ul className="mt-3 space-y-3 pr-1" aria-label="Saved updates">
                {savedUpdates.length === 0 ? (
                  <li className="rounded-lg border border-dashed border-gray-200 bg-white/80 px-3 py-4 text-center text-xs text-gray-500">
                    {isEditing
                      ? 'No saved updates yet. Describe your change and click Save Update.'
                      : 'No saved updates recorded in this session.'}
                  </li>
                ) : (
                  savedUpdates
                    .slice()
                    .reverse()
                    .map((u) => (
                      <SavedUpdateCard
                        key={u.id}
                        update={u}
                        isCurrent={currentSections ? sectionsMatch(currentSections, u.sectionsSnapshot) : false}
                        isEditing={isEditing}
                        isOnlySavedUpdate={savedUpdates.length === 1}
                        onRestore={onRestoreSavedUpdate}
                        onDelete={onDeleteSavedUpdate}
                        onDiscardWorkingCopy={onDiscardWorkingCopy}
                      />
                    ))
                )}
              </ul>
            </div>

          </div>
        ) : null}
        </div>
      </div>
    </aside>
  )
}
