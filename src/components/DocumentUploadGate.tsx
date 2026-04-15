import { useCallback, useId, useState } from 'react'

import type { DocumentModel } from '../document'
import { SpellbookLogo } from './icons'

export type JoinCollaborationGateProps = {
  serverUrl: string
  onServerUrlChange: (url: string) => void
  onJoinRoom: (code: string, displayName: string) => void
  connecting: boolean
  error: string | null
  onClearError: () => void
  joinName: string
  onJoinNameChange: (name: string) => void
}

type DocumentUploadGateProps = {
  onDocumentLoaded: (document: DocumentModel) => void
  /** Lets collaborators join a room before uploading their own file. */
  joinCollaboration?: JoinCollaborationGateProps
}

export function DocumentUploadGate({ onDocumentLoaded, joinCollaboration }: DocumentUploadGateProps) {
  const inputId = useId()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [joinCode, setJoinCode] = useState('')

  const processFile = useCallback(
    async (file: File) => {
      setError(null)
      if (!file.name.toLowerCase().endsWith('.docx')) {
        setError('Please choose a Word file (.docx).')
        return
      }
      setBusy(true)
      try {
        const { importDocxFromFile } = await import('../docxImport')
        const doc = await importDocxFromFile(file)
        onDocumentLoaded(doc)
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Could not read this file.'
        setError(message)
      } finally {
        setBusy(false)
      }
    },
    [onDocumentLoaded],
  )

  const joinBusy = joinCollaboration?.connecting ?? false

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto bg-gray-100/80 px-4 py-12">
      <div className="flex w-full max-w-4xl flex-col gap-8">
        <div className="flex flex-col items-center text-center">
          <SpellbookLogo className="h-10 w-10" />
          <h1 className="mt-4 font-serif text-2xl font-normal text-gray-900">Spellbook</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-gray-600">
            Upload a contract to work on it here, or join a live session with a room code from the document owner.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 md:items-stretch">
          <div className="rounded-2xl border border-gray-200 bg-white px-8 py-10 shadow-sm">
            <h2 className="text-center font-serif text-lg font-medium text-gray-900">Upload a document</h2>
            <p className="mt-2 text-center text-xs leading-relaxed text-gray-500">
              Official and working-copy workflow starts after the file loads.
            </p>

            <label
              htmlFor={inputId}
              onDragEnter={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOver(false)
                const f = e.dataTransfer.files[0]
                if (f) void processFile(f)
              }}
              className={`mt-6 flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed px-6 py-10 transition-colors ${
                dragOver
                  ? 'border-blue-400 bg-blue-50/60'
                  : 'border-gray-300 bg-gray-50/80 hover:border-gray-400 hover:bg-gray-50'
              } ${busy ? 'pointer-events-none opacity-60' : ''}`}
            >
              <input
                id={inputId}
                type="file"
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="sr-only"
                disabled={busy}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void processFile(f)
                  e.target.value = ''
                }}
              />
              <span className="text-sm font-semibold text-gray-800">
                {busy ? 'Reading document…' : 'Drop a .docx here or click to browse'}
              </span>
              <span className="mt-2 text-xs text-gray-500">Microsoft Word .docx only</span>
            </label>

            {error ? (
              <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-center text-sm text-red-800">
                {error}
              </p>
            ) : null}
          </div>

          {joinCollaboration ? (
            <div className="rounded-2xl border border-gray-200 bg-white px-8 py-10 shadow-sm">
              <h2 className="text-center font-serif text-lg font-medium text-gray-900">Join a live session</h2>
              <p className="mt-2 text-center text-xs leading-relaxed text-gray-500">
                Enter the room code the host shared. You will load the shared document as an editor.
              </p>

              <div className="mt-6 space-y-3">
                <label className="block text-xs font-medium text-gray-600">
                  Your name
                  <input
                    type="text"
                    value={joinCollaboration.joinName}
                    onChange={(e) => joinCollaboration.onJoinNameChange(e.target.value)}
                    placeholder="e.g. Alex"
                    disabled={joinBusy}
                    className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 disabled:bg-gray-100"
                  />
                </label>
                <label className="block text-xs font-medium text-gray-600">
                  Room code
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="From the host"
                    maxLength={8}
                    disabled={joinBusy}
                    className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 font-mono text-sm uppercase tracking-wider text-gray-900 disabled:bg-gray-100"
                  />
                </label>
                <button
                  type="button"
                  disabled={!joinCode.trim() || !joinCollaboration.joinName.trim() || joinBusy}
                  onClick={() => joinCollaboration.onJoinRoom(joinCode.trim(), joinCollaboration.joinName.trim())}
                  className="w-full rounded-lg bg-slate-800 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-900 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {joinBusy ? 'Connecting…' : 'Join room'}
                </button>
              </div>

              {joinCollaboration.error ? (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  {joinCollaboration.error}
                  <button
                    type="button"
                    onClick={joinCollaboration.onClearError}
                    className="mt-2 block text-xs font-semibold text-red-900 underline"
                  >
                    Dismiss
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
