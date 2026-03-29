import { IconClock } from './icons'

export type WorkspaceBadgeTone = 'official' | 'working' | 'in_review'

type WorkspaceHeaderProps = {
  documentTitle: string
  versionLabel: string
  badgeTone: WorkspaceBadgeTone
}

const badgeToneClass: Record<WorkspaceBadgeTone, string> = {
  official: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  working: 'border-amber-300 bg-amber-50 text-amber-900',
  in_review: 'border-violet-300 bg-violet-50 text-violet-900',
}

export function WorkspaceHeader({ documentTitle, versionLabel, badgeTone }: WorkspaceHeaderProps) {
  return (
    <header className="flex shrink-0 flex-wrap items-start justify-between gap-4 border-b border-gray-200 bg-white px-6 py-4">
      <div className="min-w-0 flex flex-wrap items-center gap-3">
        <h1 className="truncate text-lg font-semibold tracking-tight text-gray-900 md:text-xl">{documentTitle}</h1>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${badgeToneClass[badgeTone]}`}
        >
          {versionLabel}
        </span>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600">
          <IconClock className="text-gray-500" />
          <span>Trial: 6 days</span>
        </div>
        <button
          type="button"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
        >
          Upgrade
        </button>
      </div>
    </header>
  )
}
