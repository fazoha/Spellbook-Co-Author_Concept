import type { DocumentModel, DocumentSectionData } from '../document'

const textareaBodyClass =
  'mt-4 w-full resize-y rounded-md border border-transparent bg-gray-50/80 px-3 py-2.5 font-serif text-base leading-relaxed text-gray-800 shadow-inner transition-colors placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20'

const textareaReadOnlyClass =
  'cursor-default border-gray-100 bg-gray-50 text-gray-700 shadow-none hover:border-gray-100 hover:bg-gray-50'

type DocumentSectionProps = {
  section: DocumentSectionData
  readOnly: boolean
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
  if (kind === 'hero') return 'min-h-[8rem]'
  if (kind === 'note') return 'min-h-[5rem]'
  return 'min-h-[7rem]'
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

function DocumentSection({ section, readOnly, onBodyChange }: DocumentSectionProps) {
  const { id, title, body, kind } = section
  const wrapClass = kind === 'hero' ? undefined : 'mt-10'

  return (
    <section className={wrapClass}>
      <h2 className={sectionTitleClass(kind)}>{title}</h2>
      <textarea
        value={body}
        readOnly={readOnly}
        onChange={(e) => onBodyChange(id, e.target.value)}
        className={`${textareaBodyClass} ${sectionMinHeight(kind)} ${sectionBodyExtraClass(kind, readOnly)}`.trim()}
        rows={6}
        spellCheck
      />
    </section>
  )
}

type DocumentViewerProps = {
  document: DocumentModel
  readOnly: boolean
  onSectionBodyChange: (sectionId: string, body: string) => void
}

export function DocumentViewer({ document, readOnly, onSectionBodyChange }: DocumentViewerProps) {
  return (
    <article
      className="mx-auto w-full max-w-3xl rounded-lg border border-gray-200 bg-white px-10 py-12 shadow-sm md:px-14 md:py-16"
      aria-label="Document content"
    >
      <div className="max-w-none text-gray-900">
        <p className="text-center text-sm font-sans font-medium uppercase tracking-widest text-gray-500">
          Master Services Agreement
        </p>

        {document.sections.map((section) => (
          <DocumentSection
            key={section.id}
            section={section}
            readOnly={readOnly}
            onBodyChange={onSectionBodyChange}
          />
        ))}
      </div>
    </article>
  )
}
