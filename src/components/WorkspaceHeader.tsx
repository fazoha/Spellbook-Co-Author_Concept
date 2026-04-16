import { useEffect, useRef, useState } from 'react'
import type { OfficialVersionSnapshot } from '../document'

export type WorkspaceBadgeTone = 'official' | 'working' | 'in_review'

type WorkspaceHeaderProps = {
  documentTitle: string
  versionLabel: string
  badgeTone: WorkspaceBadgeTone
  displayName?: string
  role?: 'owner' | 'editor' | null
  officialHistory?: OfficialVersionSnapshot[]
  historyViewingVersion?: OfficialVersionSnapshot | null
  onSelectHistoryVersion?: (version: OfficialVersionSnapshot | null) => void
}

const badgeToneClass: Record<WorkspaceBadgeTone, string> = {
  official: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  working: 'border-amber-300 bg-amber-50 text-amber-900',
  in_review: 'border-violet-300 bg-violet-50 text-violet-900',
}

function formatHistoryDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

export function WorkspaceHeader({
  documentTitle,
  versionLabel,
  badgeTone,
  displayName,
  role,
  officialHistory = [],
  historyViewingVersion,
  onSelectHistoryVersion,
}: WorkspaceHeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on click outside
  useEffect(() => {
    if (!dropdownOpen) return
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [dropdownOpen])

  const hasHistory = officialHistory.length > 0

  return (
    <header className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-gray-200 bg-white px-6 py-4">
      <div className="min-w-0 flex flex-wrap items-center gap-3">
        <h1 className="truncate text-lg font-semibold tracking-tight text-gray-900 md:text-xl">{documentTitle}</h1>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${badgeToneClass[badgeTone]}`}
        >
          {versionLabel}
        </span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {hasHistory ? (
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen((p) => !p)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors ${
                historyViewingVersion
                  ? 'border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                <path fillRule="evenodd" d="M1 8a7 7 0 1 1 14 0A7 7 0 0 1 1 8Zm7.75-4.25a.75.75 0 0 0-1.5 0V8c0 .414.336.75.75.75h3.25a.75.75 0 0 0 0-1.5h-2.5v-3.5Z" clipRule="evenodd" />
              </svg>
              History
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className={`h-3 w-3 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}>
                <path fillRule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
              </svg>
            </button>
            {dropdownOpen ? (
              <div className="absolute right-0 top-full z-50 mt-1 w-72 rounded-xl border border-gray-200 bg-white shadow-lg">
                <div className="border-b border-gray-100 px-3 py-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Version History</p>
                </div>
                <ul className="max-h-64 overflow-y-auto py-1" role="listbox">
                  {/* Current (live) version — always first */}
                  <li>
                    <button
                      type="button"
                      onClick={() => { onSelectHistoryVersion?.(null); setDropdownOpen(false) }}
                      className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-gray-50 ${
                        !historyViewingVersion ? 'bg-emerald-50' : ''
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">Current Version</span>
                          {!historyViewingVersion ? (
                            <span className="inline-flex items-center rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                              Viewing
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-0.5 text-xs text-gray-500">Live official document</p>
                      </div>
                    </button>
                  </li>
                  <li className="mx-3 border-t border-gray-100" />
                  {/* Past versions — most recent first */}
                  {officialHistory
                    .slice()
                    .reverse()
                    .map((version, idx) => {
                      const isViewing = historyViewingVersion?.id === version.id
                      const versionNumber = officialHistory.length - idx
                      return (
                        <li key={version.id}>
                          <button
                            type="button"
                            onClick={() => { onSelectHistoryVersion?.(version); setDropdownOpen(false) }}
                            className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-gray-50 ${
                              isViewing ? 'bg-blue-50' : ''
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900">Version {versionNumber}</span>
                                {isViewing ? (
                                  <span className="inline-flex items-center rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-800">
                                    Viewing
                                  </span>
                                ) : null}
                              </div>
                              <p className="mt-0.5 text-xs text-gray-500">{formatHistoryDate(version.timestamp)}</p>
                            </div>
                          </button>
                        </li>
                      )
                    })}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
        {displayName && role ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Signed in as</span>
            <span className="rounded-full border border-gray-200 bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-800">
              {displayName}
            </span>
            <span
              className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${
                role === 'owner'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-indigo-200 bg-indigo-50 text-indigo-800'
              }`}
            >
              {role === 'owner' ? 'Official Owner' : 'Collaborator'}
            </span>
          </div>
        ) : null}
      </div>
    </header>
  )
}
