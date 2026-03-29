import { useCallback, useId, useState } from 'react'

import type { DocumentModel } from '../document'
import { SpellbookLogo } from './icons'

type DocumentUploadGateProps = {
  onDocumentLoaded: (document: DocumentModel) => void
}

export function DocumentUploadGate({ onDocumentLoaded }: DocumentUploadGateProps) {
  const inputId = useId()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

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

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center bg-gray-100/80 px-4 py-12">
      <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white px-8 py-10 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <SpellbookLogo className="h-10 w-10" />
          <h1 className="mt-4 font-serif text-2xl font-normal text-gray-900">Open a contract</h1>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            Upload a Word document (.docx) to work on it here. Your official and working-copy workflow starts after
            the file loads.
          </p>
        </div>

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
          className={`mt-8 flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed px-6 py-12 transition-colors ${
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
    </div>
  )
}
