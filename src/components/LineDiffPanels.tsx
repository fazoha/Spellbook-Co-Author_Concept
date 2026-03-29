import { diffLines } from 'diff'

type LineDiffPanelsProps = {
  oldText: string
  newText: string
  /** Tighter max height when embedded under the main editor */
  compact?: boolean
}

const removedLineClass =
  'block w-full border-l-2 border-rose-400 bg-rose-100/90 pl-2 pr-1 py-0.5 text-rose-950'
const addedLineClass =
  'block w-full border-l-2 border-emerald-500 bg-emerald-100/90 pl-2 pr-1 py-0.5 text-emerald-950'

/**
 * Side-by-side line diff: left shows official with removals highlighted, right shows new text with additions highlighted.
 */
export function LineDiffPanels({ oldText, newText, compact }: LineDiffPanelsProps) {
  const parts = diffLines(oldText, newText, {
    newlineIsToken: true,
    oneChangePerToken: true,
    stripTrailingCr: true,
  })
  const maxH = compact ? 'max-h-[min(32vh,18rem)]' : 'max-h-[min(50vh,28rem)]'

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Official — removed lines</p>
        <div
          className={`w-full min-h-[100px] overflow-y-auto rounded-md border border-gray-200 bg-gray-50/80 px-2 py-2 font-mono text-xs leading-relaxed text-gray-900 ${maxH}`}
          role="region"
          aria-label="Official text; removed segments highlighted"
        >
          {parts.map((part, i) => {
            if (part.added) return null
            const key = `o-${i}`
            if (part.removed) {
              return (
                <span key={key} className={removedLineClass} style={{ whiteSpace: 'pre-wrap' }}>
                  {part.value}
                </span>
              )
            }
            return (
              <span key={key} className="text-gray-800" style={{ whiteSpace: 'pre-wrap' }}>
                {part.value}
              </span>
            )
          })}
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Working — added lines</p>
        <div
          className={`w-full min-h-[100px] overflow-y-auto rounded-md border border-gray-200 bg-gray-50/80 px-2 py-2 font-mono text-xs leading-relaxed text-gray-900 ${maxH}`}
          role="region"
          aria-label="Working text; added segments highlighted"
        >
          {parts.map((part, i) => {
            if (part.removed) return null
            const key = `w-${i}`
            if (part.added) {
              return (
                <span key={key} className={addedLineClass} style={{ whiteSpace: 'pre-wrap' }}>
                  {part.value}
                </span>
              )
            }
            return (
              <span key={key} className="text-gray-800" style={{ whiteSpace: 'pre-wrap' }}>
                {part.value}
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function LineDiffLegend({ className = '' }: { className?: string }) {
  return (
    <p className={`text-center text-[11px] text-gray-500 ${className}`.trim()}>
      <span className="rounded bg-rose-100 px-1.5 py-0.5 text-rose-900">Rose</span> removed vs official ·{' '}
      <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-900">Green</span> added in working copy
    </p>
  )
}
