import { getChangedSectionIds } from '../document'
import type { DocumentModel, DocumentSectionData } from '../document'
import { LineDiffLegend, LineDiffPanels } from './LineDiffPanels'

const readOnlyBox =
  'w-full resize-none rounded-md border border-gray-200 bg-gray-50 px-3 py-2.5 font-serif text-sm leading-relaxed text-gray-800'

type ReviewCompareViewProps = {
  officialDocument: DocumentModel
  submittedDocument: DocumentModel
  acceptedSectionIds: string[]
  rejectedSectionIds: string[]
  onAcceptSection: (sectionId: string) => void
  onRejectSection: (sectionId: string) => void
}

function sectionShellClass(
  changed: boolean,
  sectionId: string,
  acceptedSectionIds: string[],
  rejectedSectionIds: string[],
): string {
  if (!changed) return 'rounded-xl border border-gray-200 bg-white p-4 shadow-sm'
  const accepted = acceptedSectionIds.includes(sectionId)
  const rejected = rejectedSectionIds.includes(sectionId)
  if (accepted) return 'rounded-xl border-2 border-emerald-400 bg-emerald-50/40 p-4 shadow-sm ring-1 ring-emerald-200'
  if (rejected) return 'rounded-xl border-2 border-red-300 bg-red-50/40 p-4 shadow-sm ring-1 ring-red-200'
  return 'rounded-xl border-2 border-amber-300 bg-amber-50/30 p-4 shadow-sm ring-2 ring-amber-200/80'
}

export function ReviewCompareView({
  officialDocument,
  submittedDocument,
  acceptedSectionIds,
  rejectedSectionIds,
  onAcceptSection,
  onRejectSection,
}: ReviewCompareViewProps) {
  const docSubtitle = officialDocument.documentTitle ?? 'Document'
  const changedIds = new Set(getChangedSectionIds(officialDocument, submittedDocument))

  function submittedSectionFor(id: string): DocumentSectionData | undefined {
    return submittedDocument.sections.find((s) => s.id === id)
  }

  return (
    <article
      className="mx-auto w-full max-w-6xl rounded-lg border border-gray-200 bg-white px-4 py-8 shadow-sm md:px-8 md:py-10"
      aria-label="Compare official and submitted versions"
    >
      <p className="text-center text-sm font-sans font-medium uppercase tracking-widest text-gray-500">{docSubtitle}</p>
      <h2 className="mt-4 text-center font-serif text-lg text-gray-800">Review changes</h2>
      <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-gray-600">
        Changed sections use a line diff: removals on the left, additions on the right. Choose Accept or Reject for each
        section.
      </p>
      <LineDiffLegend className="mt-4" />

      <div className="mt-10 space-y-10">
        {officialDocument.sections.map((officialSec, index) => {
          const sub = submittedSectionFor(officialSec.id)
          if (!sub) return null
          const changed = changedIds.has(officialSec.id)
          const decided =
            changed && (acceptedSectionIds.includes(officialSec.id) || rejectedSectionIds.includes(officialSec.id))
          const titleClass =
            officialSec.kind === 'hero'
              ? index === 0
                ? 'mt-0 text-center font-serif text-xl font-normal text-gray-900 md:text-2xl'
                : 'text-center font-serif text-xl font-normal text-gray-900'
              : officialSec.kind === 'note'
                ? 'font-sans text-sm font-semibold text-amber-900'
                : 'font-serif text-lg font-normal text-gray-900'

          return (
            <section key={officialSec.id} className={sectionShellClass(changed, officialSec.id, acceptedSectionIds, rejectedSectionIds)}>
              {changed ? (
                <p className="mb-3 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900">
                  Changed
                </p>
              ) : (
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Unchanged</p>
              )}
              <h3 className={titleClass}>{officialSec.title}</h3>

              {changed ? (
                <div className="mt-4">
                  <LineDiffPanels oldText={officialSec.body} newText={sub.body} />
                </div>
              ) : (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Official Version</p>
                    <textarea readOnly className={`${readOnlyBox} min-h-[120px]`} value={officialSec.body} rows={6} />
                  </div>
                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Submitted Working Copy
                    </p>
                    <textarea readOnly className={`${readOnlyBox} min-h-[120px]`} value={sub.body} rows={6} />
                  </div>
                </div>
              )}

              {changed ? (
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-200/80 pt-4">
                  <button
                    type="button"
                    onClick={() => onAcceptSection(officialSec.id)}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold shadow-sm ${
                      acceptedSectionIds.includes(officialSec.id)
                        ? 'bg-emerald-700 text-white'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => onRejectSection(officialSec.id)}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold shadow-sm ${
                      rejectedSectionIds.includes(officialSec.id)
                        ? 'bg-red-700 text-white'
                        : 'bg-white text-red-800 ring-1 ring-red-300 hover:bg-red-50'
                    }`}
                  >
                    Reject
                  </button>
                  {!decided ? (
                    <span className="text-xs text-amber-800">Decision required to merge</span>
                  ) : acceptedSectionIds.includes(officialSec.id) ? (
                    <span className="text-xs font-medium text-emerald-800">Will merge this section</span>
                  ) : (
                    <span className="text-xs font-medium text-red-800">Will keep official text</span>
                  )}
                </div>
              ) : null}
            </section>
          )
        })}
      </div>
    </article>
  )
}
