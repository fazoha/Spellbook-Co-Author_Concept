import mammoth from 'mammoth'

import type { DocumentModel, SectionKind } from './document'

/** Map common Word paragraph styles to HTML headings so we can split sections. */
const STYLE_MAP = [
  "p[style-name='Heading 1'] => h1:fresh",
  "p[style-name='Heading 2'] => h2:fresh",
  "p[style-name='Heading 3'] => h3:fresh",
  "p[style-name='Title'] => h1:fresh",
].join('\n')

const HEADING_TAGS = new Set(['H1', 'H2', 'H3'])

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
 * Leading paragraphs become one section titled "Document".
 */
export function htmlToSections(html: string): { title: string; body: string }[] {
  const trimmed = html.trim()
  if (!trimmed) return []

  const parser = new DOMParser()
  const doc = parser.parseFromString(`<div class="docx-root">${trimmed}</div>`, 'text/html')
  const root = doc.querySelector('.docx-root')
  if (!root) return []

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

  for (const child of Array.from(root.children)) {
    if (HEADING_TAGS.has(child.tagName)) {
      if (pendingTitle !== null || bodyParts.length > 0) flush()
      pendingTitle = textFromEl(child) || 'Untitled'
    } else {
      const t = textFromEl(child)
      if (t.length > 0) bodyParts.push(t)
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
