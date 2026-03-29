import { useMemo } from 'react'

import { getChangedSectionIds, getReviewOverlapSections } from '../document'
import type { DocumentModel, DocumentSectionData, ReviewOverlapSection } from '../document'
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
  overlap: boolean,
  sectionId: string,
  acceptedSectionIds: string[],
  rejectedSectionIds: string[],
): string {
  if (!changed) return 'rounded-xl border border-gray-200 bg-white p-4 shadow-sm'
  const accepted = acceptedSectionIds.includes(sectionId)
  const rejected = rejectedSectionIds.includes(sectionId)
  if (accepted)
    return 'rounded-xl border-2 border-emerald-400 bg-emerald-50/40 p-4 shadow-sm ring-1 ring-emerald-200'
  if (rejected)
    return 'rounded-xl border-2 border-red-300 bg-red-50/40 p-4 shadow-sm ring-1 ring-red-200'
  if (overlap)
    return 'rounded-xl border-2 border-rose-400 bg-rose-50/30 p-4 shadow-sm ring-2 ring-rose-200/90'
  return 'rounded-xl border-2 border-amber-300 bg-amber-50/30 p-4 shadow-sm ring-2 ring-amber-200/80'
}

function OverlapThreeColumnView({ o }: { o: ReviewOverlapSection }) {
  return (
    <div className="mt-4 space-y-4">
      <div className="rounded-md border border-gray-200 bg-white p-3 shadow-sm">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Common base (when editor branched)</p>
        <textarea readOnly className={`${readOnlyBox} mt-2 min-h-[72px]`} value={o.baseBody} rows={4} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-700">Your official (now)</p>
          <textarea readOnly className={`${readOnlyBox} min-h-[120px]`} value={o.officialBody} rows={6} />
        </div>
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-indigo-900">Editor submission</p>
          <textarea readOnly className={`${readOnlyBox} min-h-[120px]`} value={o.submittedBody} rows={6} />
        </div>
      </div>
      <div className="rounded-md border border-dashed border-gray-200 bg-gray-50/80 px-3 py-2">
        <p className="text-[10px] font-semibold uppercase text-gray-500">Quick diff (official → submission)</p>
        <div className="mt-2">
          <LineDiffPanels oldText={o.officialBody} newText={o.submittedBody} />
        </div>
      </div>
    </div>
  )
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
  const changedIds = useMemo(
    () => new Set(getChangedSectionIds(officialDocument, submittedDocument)),
    [officialDocument, submittedDocument],
  )
  const overlaps = useMemo(
    () => getReviewOverlapSections(officialDocument, submittedDocument),
    [officialDocument, submittedDocument],
  )
  const overlapById = useMemo(() => {
    const m = new Map<string, ReviewOverlapSection>()
    overlaps.forEach((o) => m.set(o.sectionId, o))
    return m
  }, [overlaps])
  const overlapIds = useMemo(() => new Set(overlaps.map((o) => o.sectionId)), [overlaps])
  const canDetectOverlaps = Boolean(submittedDocument.branchBaseSections?.length)

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
        Changed sections use a line diff unless both you and the editor edited since their branch — then you get a
        three-way view. Choose Accept or Reject for each changed section.
      </p>
      <LineDiffLegend className="mt-4" />

      {overlaps.length > 0 ? (
        <div
          className="mt-6 rounded-xl border border-rose-200 bg-rose-50/80 px-4 py-4 text-rose-950 shadow-sm"
          role="status"
        >
          <p className="text-sm font-semibold text-rose-950">
            {overlaps.length} section{overlaps.length === 1 ? '' : 's'} with overlapping changes
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-rose-900/90">
            The editor changed these after branching, and your official also changed from the same starting text. Use the
            side-by-side columns to compare base, your current official, and their submission — then Accept to take their
            wording or Reject to keep yours.
          </p>
          <ul className="mt-3 flex flex-wrap gap-2" aria-label="Jump to overlapping sections">
            {overlaps.map((o) => (
              <li key={o.sectionId}>
                <a
                  href={`#review-sec-${o.sectionId}`}
                  className="inline-flex rounded-full border border-rose-300 bg-white px-3 py-1 text-xs font-medium text-rose-900 shadow-sm hover:bg-rose-100"
                >
                  {o.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : canDetectOverlaps ? null : (
        <p className="mx-auto mt-6 max-w-2xl rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-center text-xs text-gray-600">
          Overlap detection uses the editor&apos;s branch snapshot. If this submission was created by an older client, you
          may not see overlap flags.
        </p>
      )}

      <div className="mt-10 space-y-10">
        {officialDocument.sections.map((officialSec, index) => {
          const sub = submittedSectionFor(officialSec.id)
          if (!sub) return null
          const changed = changedIds.has(officialSec.id)
          const overlap = overlapIds.has(officialSec.id)
          const overlapDetail = overlapById.get(officialSec.id)
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
            <section
              key={officialSec.id}
              id={`review-sec-${officialSec.id}`}
              className={sectionShellClass(changed, overlap, officialSec.id, acceptedSectionIds, rejectedSectionIds)}
            >
              {changed ? (
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {overlap ? (
                    <p className="inline-flex rounded-full bg-rose-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-950">
                      Overlapping changes
                    </p>
                  ) : (
                    <p className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900">
                      Changed
                    </p>
                  )}
                </div>
              ) : (
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Unchanged</p>
              )}
              <h3 className={titleClass}>{officialSec.title}</h3>

              {changed && overlap && overlapDetail ? (
                <OverlapThreeColumnView o={overlapDetail} />
              ) : changed ? (
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
