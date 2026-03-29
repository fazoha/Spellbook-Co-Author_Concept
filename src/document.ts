export type SectionKind = 'hero' | 'standard' | 'note'

export type DocumentSectionData = {
  id: string
  title: string
  body: string
  kind: SectionKind
}

export type SavedUpdate = {
  id: string
  note: string
  /** ISO-8601 timestamp when the update was saved */
  timestamp: string
  /** Sections as they were when this update was saved */
  sectionsSnapshot: DocumentSectionData[]
}

/** Working-copy lifecycle (not used on official document) */
export type WorkingDocumentStatus = 'editing' | 'in_review'

/** One submission for review — simulates a pull request */
export type ReviewRequest = {
  id: string
  submittedAt: string
  /** Full working copy at submission time */
  workingCopy: {
    sections: DocumentSectionData[]
    savedUpdates: SavedUpdate[]
  }
}

export type DocumentModel = {
  sections: DocumentSectionData[]
  /** Stable id for this upload in a multi-document workspace */
  workspaceId?: string
  /** Shown in the workspace header (e.g. uploaded file name without .docx) */
  documentTitle?: string
  /** Official document only: changes when a new official version is published */
  versionId?: string
  /** Working copy: official version this branch started from */
  basedOnVersionId?: string
  /** Working copy: snapshot of official sections at branch time (merge base) */
  branchBaseSections?: DocumentSectionData[]
  /** Present only on working copy; each entry simulates a human-readable commit */
  savedUpdates?: SavedUpdate[]
  /** Working copy only: whether the user can still edit before approval */
  status?: WorkingDocumentStatus
  /** Working copy only: submissions sent for review */
  reviewRequests?: ReviewRequest[]
}

export function createInitialOfficialDocument(): DocumentModel {
  return {
    versionId: crypto.randomUUID(),
    sections: [
      {
        id: 'definitions',
        kind: 'hero',
        title: '1. Definitions',
        body:
          '"Agreement" means this Master Services Agreement together with all Statements of Work and exhibits attached hereto. "Services" means the professional services described in an applicable Statement of Work. "Deliverables" means all work product, reports, and materials provided by the Provider in performing the Services.',
      },
      {
        id: 'scope',
        kind: 'standard',
        title: '2. Scope of services',
        body:
          'The Provider shall perform the Services in accordance with the timelines, milestones, and acceptance criteria set forth in each Statement of Work. Any changes to scope must be documented in writing and signed by both parties before work begins.',
      },
      {
        id: 'fees',
        kind: 'standard',
        title: '3. Fees and payment',
        body:
          'Fees are as stated in the applicable Statement of Work. Invoices are due net thirty (30) days from the invoice date unless otherwise agreed. Late payments may accrue interest at the lesser of one and one-half percent (1.5%) per month or the maximum rate permitted by law.',
      },
      {
        id: 'note',
        kind: 'note',
        title: 'Note',
        body:
          'Section 4 (Confidentiality) and Section 5 (Limitation of liability) continue on the following pages of this document.',
      },
    ],
  }
}

export function cloneDocument(doc: DocumentModel): DocumentModel {
  return structuredClone(doc)
}

export function updateSectionBody(doc: DocumentModel, sectionId: string, body: string): DocumentModel {
  if (doc.status === 'in_review') return doc
  return {
    ...doc,
    sections: doc.sections.map((s) => (s.id === sectionId ? { ...s, body } : s)),
  }
}

export function appendSavedUpdate(doc: DocumentModel, note: string): DocumentModel {
  if (doc.status === 'in_review') return doc
  const trimmed = note.trim()
  const entry: SavedUpdate = {
    id: crypto.randomUUID(),
    note: trimmed.length > 0 ? trimmed : '(no note)',
    timestamp: new Date().toISOString(),
    sectionsSnapshot: structuredClone(doc.sections),
  }
  return {
    ...doc,
    savedUpdates: [...(doc.savedUpdates ?? []), entry],
  }
}

export function submitWorkingDocumentForReview(doc: DocumentModel): DocumentModel {
  if (doc.status !== 'editing') return doc
  const request: ReviewRequest = {
    id: crypto.randomUUID(),
    submittedAt: new Date().toISOString(),
    workingCopy: {
      sections: structuredClone(doc.sections),
      savedUpdates: structuredClone(doc.savedUpdates ?? []),
    },
  }
  return {
    ...doc,
    status: 'in_review',
    reviewRequests: [...(doc.reviewRequests ?? []), request],
  }
}

/** Section ids whose body differs between official and submitted working copy */
export function getChangedSectionIds(official: DocumentModel, working: DocumentModel): string[] {
  const ids: string[] = []
  for (const s of official.sections) {
    const w = working.sections.find((x) => x.id === s.id)
    if (w && w.body !== s.body) ids.push(s.id)
  }
  return ids
}

/** Build new official: accepted sections take body from working; others keep official body */
export function mergeOfficialWithDecisions(
  official: DocumentModel,
  working: DocumentModel,
  acceptedSectionIds: Set<string>,
): DocumentModel {
  return {
    versionId: crypto.randomUUID(),
    workspaceId: official.workspaceId,
    documentTitle: official.documentTitle,
    sections: official.sections.map((s) => {
      if (acceptedSectionIds.has(s.id)) {
        const w = working.sections.find((ws) => ws.id === s.id)
        return w ? { ...s, body: w.body } : s
      }
      return { ...s }
    }),
  }
}

/** Section where both you and official changed since branch — needs human resolution */
export type SectionOverlap = {
  sectionId: string
  title: string
  kind: SectionKind
  baseBody: string
  mineBody: string
  officialBody: string
}

/** Owner reviewing an editor submission: both editor and current official diverged from the same merge base */
export type ReviewOverlapSection = {
  sectionId: string
  title: string
  kind: SectionKind
  baseBody: string
  officialBody: string
  submittedBody: string
}

/**
 * Sections where the editor changed text after branching *and* the current official differs from that branch base.
 * Requires `submitted.branchBaseSections` (set when the editor started their working copy).
 */
export function getReviewOverlapSections(
  official: DocumentModel,
  submitted: DocumentModel,
): ReviewOverlapSection[] {
  const base = submitted.branchBaseSections
  if (!base?.length) return []

  const out: ReviewOverlapSection[] = []
  for (const offSec of official.sections) {
    const b = base.find((x) => x.id === offSec.id)
    const sub = submitted.sections.find((x) => x.id === offSec.id)
    if (!b || !sub) continue

    const editorChanged = sub.body !== b.body
    const officialChanged = offSec.body !== b.body
    if (editorChanged && officialChanged) {
      out.push({
        sectionId: offSec.id,
        title: offSec.title,
        kind: offSec.kind,
        baseBody: b.body,
        officialBody: offSec.body,
        submittedBody: sub.body,
      })
    }
  }
  return out
}

/**
 * Rebase working copy onto latest official.
 * - Only-working changes: keep yours
 * - Only-official changes: take official
 * - Both changed: overlap (conflict)
 */
export function computeUpdateToLatest(
  official: DocumentModel,
  working: DocumentModel,
): { mergedSections: DocumentSectionData[]; overlaps: SectionOverlap[] } {
  const base = working.branchBaseSections
  if (!base?.length || !working.basedOnVersionId) {
    return { mergedSections: structuredClone(working.sections), overlaps: [] }
  }

  const overlaps: SectionOverlap[] = []

  const mergedSections: DocumentSectionData[] = official.sections.map((theirs) => {
    const b = base.find((x) => x.id === theirs.id)
    const mine = working.sections.find((m) => m.id === theirs.id)
    if (!b || !mine) return { ...theirs }

    const workingDelta = mine.body !== b.body
    const officialDelta = theirs.body !== b.body

    if (workingDelta && officialDelta) {
      overlaps.push({
        sectionId: theirs.id,
        title: theirs.title,
        kind: theirs.kind,
        baseBody: b.body,
        mineBody: mine.body,
        officialBody: theirs.body,
      })
      return { ...mine }
    }
    if (workingDelta && !officialDelta) return { ...mine }
    if (!workingDelta && officialDelta) return { ...theirs }
    return { ...mine }
  })

  return { mergedSections, overlaps }
}

/** Apply user choices for overlapping sections onto the auto-merged draft */
export function applyOverlapResolutions(
  draftSections: DocumentSectionData[],
  overlaps: SectionOverlap[],
  resolutions: Record<string, 'official' | 'mine'>,
): DocumentSectionData[] {
  return draftSections.map((s) => {
    const o = overlaps.find((x) => x.sectionId === s.id)
    if (!o) return s
    const r = resolutions[o.sectionId]
    if (!r) return s
    return { ...s, body: r === 'official' ? o.officialBody : o.mineBody }
  })
}
