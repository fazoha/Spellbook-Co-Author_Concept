import { useState } from 'react'
import type { DocumentSectionData, SectionOverlap } from '../document'

const readOnlyBox =
  'w-full resize-none rounded-md border border-gray-200 bg-gray-50 px-3 py-2.5 font-serif text-sm leading-relaxed text-gray-800'

type RebaseOverlapViewProps = {
  overlaps: SectionOverlap[]
  draftSections: DocumentSectionData[]
  resolutions: Record<string, 'official' | 'mine' | 'combined' | undefined>
  onChoose: (sectionId: string, choice: 'official' | 'mine' | 'combined') => void
  onCombinedText: (sectionId: string, text: string) => void
  onApplyMerge: () => void
  canApply: boolean
  coauthorApiBaseUrl?: string | null
}

export function RebaseOverlapView({
  overlaps,
  draftSections,
  resolutions,
  onChoose,
  onCombinedText,
  onApplyMerge,
  canApply,
  coauthorApiBaseUrl,
}: RebaseOverlapViewProps) {
  const [loadingIds, setLoadingIds] = useState<Record<string, boolean>>({})

  async function handleCombine(o: SectionOverlap) {
    setLoadingIds((prev) => ({ ...prev, [o.sectionId]: true }))
    try {
      const base = coauthorApiBaseUrl ?? 'http://localhost:3030'
      const res = await fetch(`${base}/api/merge-sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ officialBody: o.officialBody, mineBody: o.mineBody, sectionTitle: o.title }),
      })
      const data = await res.json()
      if (data.merged) {
        onCombinedText(o.sectionId, data.merged)
        onChoose(o.sectionId, 'combined')
      }
    } finally {
      setLoadingIds((prev) => ({ ...prev, [o.sectionId]: false }))
    }
  }

  return (
    <article className="mx-auto w-full max-w-4xl rounded-lg border border-amber-200 bg-amber-50/40 px-4 py-8 shadow-sm md:px-8 md:py-10">
      <h2 className="text-center font-serif text-xl text-gray-900">Overlapping edits</h2>
      <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-amber-950/80">
        You and the official version both changed the same sections since your branch. For each, choose which text to
        keep going forward.
      </p>

      <div className="mt-10 space-y-10">
        {overlaps.map((o) => {
          const chosen = resolutions[o.sectionId]
          const isLoading = loadingIds[o.sectionId] ?? false
          return (
            <section
              key={o.sectionId}
              className="rounded-xl border-2 border-amber-300 bg-white p-4 shadow-md ring-1 ring-amber-200/80 md:p-5"
            >
              <p className="text-xs font-bold uppercase tracking-wide text-amber-900">Overlapping edit</p>
              <h3 className="mt-2 font-serif text-lg text-gray-900">{o.title}</h3>

              <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 p-3">
                <p className="text-[10px] font-semibold uppercase text-gray-500">Common base (when you branched)</p>
                <p className="mt-1 whitespace-pre-wrap font-serif text-xs text-gray-600">{o.baseBody}</p>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-600">Official version</p>
                  <textarea readOnly className={`${readOnlyBox} min-h-[100px]`} value={o.officialBody} rows={5} />
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-600">My version</p>
                  <textarea readOnly className={`${readOnlyBox} min-h-[100px]`} value={o.mineBody} rows={5} />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onChoose(o.sectionId, 'official')}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold shadow-sm ${
                    chosen === 'official'
                      ? 'bg-slate-800 text-white'
                      : 'bg-white text-gray-800 ring-1 ring-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Keep official
                </button>
                <button
                  type="button"
                  onClick={() => onChoose(o.sectionId, 'mine')}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold shadow-sm ${
                    chosen === 'mine'
                      ? 'bg-blue-700 text-white'
                      : 'bg-white text-blue-900 ring-1 ring-blue-300 hover:bg-blue-50'
                  }`}
                >
                  Keep mine
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleCombine(o)}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold shadow-sm disabled:cursor-not-allowed disabled:opacity-60 ${
                    chosen === 'combined'
                      ? 'bg-violet-700 text-white'
                      : 'bg-white text-violet-900 ring-1 ring-violet-300 hover:bg-violet-50'
                  }`}
                >
                  {isLoading ? 'Combining…' : 'Combine Both (AI)'}
                </button>
                {chosen ? (
                  <span className="self-center text-xs text-gray-600">
                    Selected: {chosen === 'official' ? 'Official' : chosen === 'mine' ? 'Mine' : 'AI Combined'}
                  </span>
                ) : (
                  <span className="self-center text-xs text-amber-800">Choose one option</span>
                )}
              </div>
            </section>
          )
        })}
      </div>

      <div className="mt-10 flex justify-center border-t border-amber-200 pt-6">
        <button
          type="button"
          onClick={onApplyMerge}
          disabled={!canApply}
          className="rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          Apply merge &amp; update to latest
        </button>
      </div>

      <p className="mt-4 text-center text-xs text-gray-500">
        {draftSections.length} sections in draft after automatic merges (overlaps need your choices above).
      </p>
    </article>
  )
}
