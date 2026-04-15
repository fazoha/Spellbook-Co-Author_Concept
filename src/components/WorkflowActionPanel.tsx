import { useRef, type ReactNode } from 'react'

import type { DocumentModel, SavedUpdate } from '../document'

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
                      <li key={u.id} className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 shadow-sm">
                        <p className="text-sm font-medium text-gray-900">{u.note}</p>
                        <p className="mt-1 text-xs text-gray-500">{formatTime(u.timestamp)}</p>
                      </li>
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
