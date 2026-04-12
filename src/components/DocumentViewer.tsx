import { useEffect, useMemo, useRef, useState } from 'react'

import type { DocumentModel, DocumentSectionData } from '../document'
import { LineDiffLegend, LineDiffPanels } from './LineDiffPanels'

const textareaReadOnlyClass =
  'cursor-default border-gray-100 bg-gray-50 text-gray-700 shadow-none hover:border-gray-100 hover:bg-gray-50'

export type Annotation = {
  sectionId: string
  quote: string
  issue: string
  suggestion: string
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

/** Renders a textarea with an amber highlight overlay on flagged quotes */
function AnnotatedTextarea({
  body,
  readOnly,
  rows,
  minHeightClass,
  extraClass,
  onChange,
  activeAnnotation,
  onAnnotationClick,
}: {
  body: string
  readOnly: boolean
  rows: number
  minHeightClass: string
  extraClass: string
  onChange: (v: string) => void
  activeAnnotation: Annotation | null
  onAnnotationClick: (a: Annotation) => void
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [scrollTop, setScrollTop] = useState(0)

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    const onScroll = () => setScrollTop(el.scrollTop)
    el.addEventListener('scroll', onScroll)
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  // Only build overlay when a card is active and its quote exists in the body
  const segments = useMemo(() => {
    if (!activeAnnotation) return null
    const idx = body.indexOf(activeAnnotation.quote)
    if (idx === -1) return null

    type Segment = { text: string; annotation: Annotation | null }
    const result: Segment[] = []
    if (idx > 0) result.push({ text: body.slice(0, idx), annotation: null })
    result.push({ text: activeAnnotation.quote, annotation: activeAnnotation })
    if (idx + activeAnnotation.quote.length < body.length)
      result.push({ text: body.slice(idx + activeAnnotation.quote.length), annotation: null })
    return result
  }, [body, activeAnnotation])

  // Shared padding/font values that must match between textarea and overlay
  const sharedStyle: React.CSSProperties = {
    paddingTop: '0.625rem',    // py-2.5
    paddingBottom: '0.625rem',
    paddingLeft: '0.75rem',    // px-3
    paddingRight: '0.75rem',
    fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", serif',
    fontSize: '1rem',
    lineHeight: '1.625',       // leading-relaxed
  }

  return (
    // mt-4 lives here so the overlay can use top:0 without double-margin
    <div className={`relative mt-4 ${minHeightClass}`}>
      <textarea
        ref={textareaRef}
        value={body}
        readOnly={readOnly}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        spellCheck
        style={{
          ...sharedStyle,
          marginTop: 0,
          position: 'relative',
          zIndex: 1,
          // Hide textarea text only when overlay renders it instead
          color: segments ? 'transparent' : undefined,
          caretColor: '#1f2937',
          background: segments ? 'transparent' : undefined,
        }}
        className={`w-full resize-y rounded-md border border-transparent shadow-inner transition-colors placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${minHeightClass} ${extraClass}`}
      />

      {/* Highlight overlay — same font/padding as textarea, sits behind it */}
      {segments && (
        <div
          aria-hidden="true"
          style={{
            ...sharedStyle,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            overflow: 'hidden',
            pointerEvents: 'none',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            borderRadius: '0.375rem',
            background: 'rgb(249 250 251 / 0.8)',
          }}
        >
          <div style={{ transform: `translateY(-${scrollTop}px)` }}>
            {segments.map((seg, i) =>
              seg.annotation ? (
                <mark
                  key={i}
                  style={{
                    color: 'inherit',
                    background: 'rgba(251, 191, 36, 0.4)',
                    borderBottom: '2px dashed #d97706',
                    pointerEvents: 'auto',
                    cursor: 'pointer',
                  }}
                  onClick={() => onAnnotationClick(seg.annotation!)}
                  title={seg.annotation.issue}
                >
                  {seg.text}
                </mark>
              ) : (
                <span key={i} style={{ color: '#1f2937' }}>{seg.text}</span>
              )
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/** Side comment card for a single annotation */
function AnnotationCard({
  annotation,
  onDismiss,
  onApply,
  onClose,
}: {
  annotation: Annotation
  onDismiss: () => void
  onApply: (a: Annotation) => void
  onClose: () => void
}) {
  const [confirming, setConfirming] = useState(false)

  return (
    <div className="rounded-xl border border-amber-200 bg-white p-4 shadow-md text-sm">
      <div className="flex items-center justify-between mb-1">
        <p className="font-semibold text-amber-900 text-xs uppercase tracking-wide">AI Flag</p>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-base leading-none"
          aria-label="Collapse"
        >
          ×
        </button>
      </div>
      <p className="text-gray-700 leading-snug mb-3">{annotation.issue}</p>

      {confirming ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Confirm change</p>
          <div className="rounded-md bg-red-50 border border-red-100 px-2 py-1.5">
            <p className="text-xs text-red-700 line-through leading-snug">{annotation.quote}</p>
          </div>
          <div className="rounded-md bg-green-50 border border-green-100 px-2 py-1.5">
            <p className="text-xs text-green-800 leading-snug">{annotation.suggestion}</p>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => onApply(annotation)}
              className="flex-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
            >
              Confirm
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="flex-1 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
          >
            Apply suggestion
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-50"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  )
}

type DocumentSectionProps = {
  section: DocumentSectionData
  readOnly: boolean
  compareOfficial?: DocumentModel
  onBodyChange: (sectionId: string, body: string) => void
  annotations: Annotation[]
  onDismissAnnotation: (quote: string) => void
  onApplyAnnotation: (annotation: Annotation) => void
}

function DocumentSection({
  section,
  readOnly,
  compareOfficial,
  onBodyChange,
  annotations,
  onDismissAnnotation,
  onApplyAnnotation,
}: DocumentSectionProps) {
  const { id, title, body, kind } = section
  const wrapClass = kind === 'hero' ? undefined : 'mt-10'
  const baseSection = compareOfficial?.sections.find((s) => s.id === id)
  const showLineDiff = Boolean(baseSection && baseSection.body !== body)
  const [activeAnnotation, setActiveAnnotation] = useState<Annotation | null>(null)

  // If the active annotation gets dismissed externally, clear it
  useEffect(() => {
    if (activeAnnotation && !annotations.find((a) => a.quote === activeAnnotation.quote)) {
      setActiveAnnotation(null)
    }
  }, [annotations, activeAnnotation])

  function handleApply(annotation: Annotation) {
    onApplyAnnotation(annotation)
    setActiveAnnotation(null)
  }

  function handleDismiss(quote: string) {
    onDismissAnnotation(quote)
    setActiveAnnotation(null)
  }

  return (
    <section className={wrapClass}>
      <h2 className={sectionTitleClass(kind)}>{title}</h2>
      <div className="flex gap-4 items-start">
        <div className="flex-1 min-w-0">
          <AnnotatedTextarea
            body={body}
            readOnly={readOnly}
            rows={sectionRows(kind)}
            minHeightClass={sectionMinHeight(kind)}
            extraClass={sectionBodyExtraClass(kind, readOnly)}
            onChange={(v) => onBodyChange(id, v)}
            activeAnnotation={activeAnnotation}
            onAnnotationClick={(a) => setActiveAnnotation((prev) => (prev?.quote === a.quote ? null : a))}
          />
          {showLineDiff && baseSection ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-950">Line diff vs official</p>
              <div className="mt-3">
                <LineDiffPanels oldText={baseSection.body} newText={body} compact />
              </div>
            </div>
          ) : null}
        </div>

        {/* Annotation cards column */}
        {annotations.length > 0 && (
          <div className="w-64 shrink-0 space-y-3 pt-4">
            {annotations.map((a) => (
              <div
                key={a.quote}
                className={`transition-all duration-200 ${activeAnnotation?.quote === a.quote ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}
              >
                {activeAnnotation?.quote === a.quote ? (
                  <AnnotationCard
                    annotation={a}
                    onDismiss={() => handleDismiss(a.quote)}
                    onApply={handleApply}
                    onClose={() => setActiveAnnotation(null)}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveAnnotation(a)}
                    className="w-full rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-left text-xs text-amber-900 shadow-sm hover:bg-amber-100 transition-colors"
                  >
                    <span className="font-semibold">AI Flag</span> — {a.issue.slice(0, 55)}{a.issue.length > 55 ? '…' : ''}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

type DocumentViewerProps = {
  document: DocumentModel
  readOnly: boolean
  compareOfficial?: DocumentModel
  onSectionBodyChange: (sectionId: string, body: string) => void
  coauthorApiBase?: string | null
  annotations: Annotation[]
  onDismissAnnotation: (sectionId: string, quote: string) => void
  onApplyAnnotation: (sectionId: string, annotation: Annotation) => void
}

export function DocumentViewer({
  document,
  readOnly,
  compareOfficial,
  onSectionBodyChange,
  annotations,
  onDismissAnnotation,
  onApplyAnnotation,
}: DocumentViewerProps) {
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
      className="mx-auto w-full max-w-5xl min-h-[calc(100dvh-7.5rem)] rounded-lg border border-gray-200 bg-white px-10 py-8 shadow-sm md:px-14 md:py-10"
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
            annotations={annotations.filter((a) => a.sectionId === section.id)}
            onDismissAnnotation={(quote) => onDismissAnnotation(section.id, quote)}
            onApplyAnnotation={(a) => onApplyAnnotation(section.id, a)}
          />
        ))}
      </div>
    </article>
  )
}
