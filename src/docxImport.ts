import mammoth from 'mammoth'

import type { DocumentModel, SectionKind } from './document'

/** Map common Word paragraph styles to HTML headings so we can split sections. */
const STYLE_MAP = [
  "p[style-name='Heading 1'] => h1:fresh",
  "p[style-name='Heading 2'] => h2:fresh",
  "p[style-name='Heading 3'] => h3:fresh",
  "p[style-name='Title'] => h1:fresh",
].join('\n')

/** Top-level numbered clause only: "1. Title", "12. Something" — NOT sub-clauses like "1.1" */
const NUMBERED_CLAUSE_RE = /^\d+\.\s+\S/

/** ALL-CAPS heading: at least 3 chars, no lowercase, not too long */
function isAllCapsHeading(text: string): boolean {
  const t = text.trim()
  return t.length >= 3 && t.length <= 80 && t === t.toUpperCase() && /[A-Z]/.test(t)
}

/** Fully-bold paragraph: ≥90% of text is wrapped in <strong> or <b> */
function isFullyBold(el: Element): boolean {
  const text = el.textContent?.trim() ?? ''
  if (!text || text.length > 80) return false
  const boldText = Array.from(el.querySelectorAll('strong, b'))
    .map((b) => b.textContent ?? '')
    .join('')
    .trim()
  return boldText.length > 0 && boldText.length >= text.length * 0.9
}

function slugFragment(title: string, index: number): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
  return `${index}-${slug || 'section'}`
}

/**
 * Split mammoth HTML into sections using h1–h3 as boundaries.
 * When no Word heading styles are present, falls back to detecting implicit
 * headings: numbered clauses (e.g. "1. Payment Terms"), ALL-CAPS lines,
 * and fully-bold short paragraphs.
 * Leading paragraphs before the first heading become one section titled "Document".
 */
export function htmlToSections(html: string): { title: string; body: string }[] {
  const trimmed = html.trim()
  if (!trimmed) return []

  const parser = new DOMParser()
  const doc = parser.parseFromString(`<div class="docx-root">${trimmed}</div>`, 'text/html')
  const root = doc.querySelector('.docx-root')
  if (!root) return []

  const children = Array.from(root.children)

  const h1Elements = children.filter((c) => c.tagName === 'H1')
  const h2Elements = children.filter((c) => c.tagName === 'H2')

  // Three structural modes:
  // 1. Multiple H1s → H1 = section boundary, H2/H3 = subsections folded into body
  // 2. Single H1 (title) + H2s → H1 is decorative title (skip), H2 = section boundary
  // 3. No H1/H2/H3 → implicit detection (numbered clauses, ALL-CAPS, bold)
  const titleOnlyH1 = h1Elements.length === 1 && h2Elements.length > 0
  const effectiveBoundaryTag = titleOnlyH1 ? 'H2' : 'H1'
  const hasWordHeadings = h1Elements.length > 1 || h2Elements.length > 0

  const sections: { title: string; body: string }[] = []
  let pendingTitle: string | null = null
  let bodyParts: string[] = []

  function textFromEl(el: Element): string {
    return el.textContent?.replace(/\s+/g, ' ').trim() ?? ''
  }

  function flush() {
    const body = bodyParts.join('\n\n').trim()
    if (pendingTitle === null && bodyParts.length === 0) return
    const title = pendingTitle ?? 'Document'
    sections.push({ title, body: body.length > 0 ? body : '(empty)' })
    pendingTitle = null
    bodyParts = []
  }

  for (const child of children) {
    const text = textFromEl(child)
    const isSectionBoundary = child.tagName === effectiveBoundaryTag
    const isSubsection = child.tagName === 'H2' || child.tagName === 'H3'
    const isDecorativeTitle = titleOnlyH1 && child.tagName === 'H1'
    const isImplicitHeading =
      !hasWordHeadings &&
      child.tagName === 'P' &&
      text.length > 0 &&
      (NUMBERED_CLAUSE_RE.test(text) || isAllCapsHeading(text) || isFullyBold(child))

    if (isDecorativeTitle) {
      // Single decorative title H1 — skip it, don't create a section
      continue
    }

    if (isSectionBoundary || isImplicitHeading) {
      // Clause heading: start a new section
      if (pendingTitle !== null || bodyParts.length > 0) flush()
      pendingTitle = text || 'Untitled'
    } else if (!titleOnlyH1 && isSubsection) {
      // H2/H3 sub-clauses (only in multi-H1 mode): fold into parent section body
      if (text.length > 0) bodyParts.push(text)
    } else {
      // Regular paragraph or list item: body text
      if (text.length > 0) bodyParts.push(text)
    }
  }
  flush()

  return sections
}

function sectionKind(title: string, index: number): SectionKind {
  if (index === 0) return 'hero'
  if (/^note\b/i.test(title.trim())) return 'note'
  return 'standard'
}

/**
 * Build a {@link DocumentModel} from a .docx file buffer.
 * Uses heading styles when present; otherwise one section with plain text.
 */
export async function documentModelFromDocx(arrayBuffer: ArrayBuffer, fileName: string): Promise<DocumentModel> {
  const documentTitle = fileName.replace(/\.docx$/i, '').trim() || 'Uploaded document'

  const { value: html, messages } = await mammoth.convertToHtml({ arrayBuffer }, { styleMap: STYLE_MAP })
  let pairs = htmlToSections(html)

  if (pairs.length === 0 || pairs.every((p) => !p.body.trim() || p.body === '(empty)')) {
    const raw = await mammoth.extractRawText({ arrayBuffer })
    const text = raw.value.trim()
    if (!text) {
      const hint = messages.map((m) => m.message).join(' ')
      throw new Error(hint || 'This file has no readable text.')
    }
    pairs = [{ title: 'Document', body: text }]
  }

  return {
    workspaceId: crypto.randomUUID(),
    versionId: crypto.randomUUID(),
    documentTitle,
    sections: pairs.map((s, i) => ({
      id: `s-${slugFragment(s.title, i)}`,
      title: s.title,
      body: s.body,
      kind: sectionKind(s.title, i),
    })),
  }
}

/** Validate extension and import a .docx from a browser File. */
export async function importDocxFromFile(file: File): Promise<DocumentModel> {
  if (!file.name.toLowerCase().endsWith('.docx')) {
    throw new Error('Please choose a Word file (.docx).')
  }
  const buffer = await file.arrayBuffer()
  return documentModelFromDocx(buffer, file.name)
}
