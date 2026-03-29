import { useMemo } from 'react'

import type { DocumentModel, DocumentSectionData } from '../document'
import { LineDiffLegend, LineDiffPanels } from './LineDiffPanels'

const textareaBodyClass =
  'mt-4 w-full resize-y rounded-md border border-transparent bg-gray-50/80 px-3 py-2.5 font-serif text-base leading-relaxed text-gray-800 shadow-inner transition-colors placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20'

const textareaReadOnlyClass =
  'cursor-default border-gray-100 bg-gray-50 text-gray-700 shadow-none hover:border-gray-100 hover:bg-gray-50'

type DocumentSectionProps = {
  section: DocumentSectionData
  readOnly: boolean
  compareOfficial?: DocumentModel
  onBodyChange: (sectionId: string, body: string) => void
}

function sectionTitleClass(kind: DocumentSectionData['kind'], wrapClassName?: string): string {
  const base =
    kind === 'hero'
      ? 'mt-6 text-center font-serif text-2xl font-normal text-gray-900'
      : kind === 'note'
        ? 'font-sans text-sm font-semibold text-amber-900'
        : 'font-serif text-xl font-normal text-gray-900'
  return [base, wrapClassName].filter(Boolean).join(' ')
}

function sectionMinHeight(kind: DocumentSectionData['kind']): string {
  if (kind === 'hero') return 'min-h-[min(44rem,72vh)]'
  if (kind === 'note') return 'min-h-[12rem]'
  return 'min-h-[min(36rem,62vh)]'
}

function sectionRows(kind: DocumentSectionData['kind']): number {
  if (kind === 'hero') return 28
  if (kind === 'note') return 10
  return 22
}

function sectionBodyExtraClass(kind: DocumentSectionData['kind'], readOnly: boolean): string {
  if (kind === 'note') {
    return [
      'border-l-2 border-amber-200 bg-amber-50/90 text-gray-800 shadow-none',
      readOnly
        ? 'hover:border-amber-200'
        : 'hover:border-amber-300 focus:border-amber-400 focus:ring-amber-500/20',
    ].join(' ')
  }
  if (readOnly) return textareaReadOnlyClass
  return 'hover:border-gray-200 hover:bg-white focus:border-blue-300 focus:bg-white'
}

function DocumentSection({ section, readOnly, compareOfficial, onBodyChange }: DocumentSectionProps) {
  const { id, title, body, kind } = section
  const wrapClass = kind === 'hero' ? undefined : 'mt-10'
  const baseSection = compareOfficial?.sections.find((s) => s.id === id)
  const showLineDiff = Boolean(baseSection && baseSection.body !== body)

  return (
    <section className={wrapClass}>
      <h2 className={sectionTitleClass(kind)}>{title}</h2>
      <textarea
        value={body}
        readOnly={readOnly}
        onChange={(e) => onBodyChange(id, e.target.value)}
        className={`${textareaBodyClass} ${sectionMinHeight(kind)} ${sectionBodyExtraClass(kind, readOnly)}`.trim()}
        rows={sectionRows(kind)}
        spellCheck
      />
      {showLineDiff && baseSection ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-950">Line diff vs official</p>
          <div className="mt-3">
            <LineDiffPanels oldText={baseSection.body} newText={body} compact />
          </div>
        </div>
      ) : null}
    </section>
  )
}

type DocumentViewerProps = {
  document: DocumentModel
  readOnly: boolean
  /** When set (e.g. while editing a working copy), changed sections show a line diff under the editor. */
  compareOfficial?: DocumentModel
  onSectionBodyChange: (sectionId: string, body: string) => void
}

export function DocumentViewer({ document, readOnly, compareOfficial, onSectionBodyChange }: DocumentViewerProps) {
  const subtitle = document.documentTitle ?? 'Document'

  const showCompareLegend = useMemo(() => {
    if (!compareOfficial) return false
    return document.sections.some((s) => {
      const b = compareOfficial.sections.find((x) => x.id === s.id)
      return b !== undefined && b.body !== s.body
    })
  }, [compareOfficial, document])

  return (
    <article
      className="mx-auto w-full max-w-3xl min-h-[calc(100dvh-7.5rem)] rounded-lg border border-gray-200 bg-white px-10 py-8 shadow-sm md:px-14 md:py-10"
      aria-label="Document content"
    >
      <div className="max-w-none text-gray-900">
        <p className="text-center text-sm font-sans font-medium uppercase tracking-widest text-gray-500">{subtitle}</p>
        {showCompareLegend ? (
          <div className="mt-4 rounded-lg border border-amber-100 bg-amber-50/40 px-3 py-2">
            <LineDiffLegend />
          </div>
        ) : null}

        {document.sections.map((section) => (
          <DocumentSection
            key={section.id}
            section={section}
            readOnly={readOnly}
            compareOfficial={compareOfficial}
            onBodyChange={onSectionBodyChange}
          />
        ))}
      </div>
    </article>
  )
}
