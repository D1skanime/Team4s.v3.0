import type {
  ReleaseReviewCounts,
  ReleaseReviewDetail,
  ReleaseReviewImageCategory,
  ReleaseReviewQueueItem,
  ReleaseReviewRejectionCategory,
  ReleaseReviewType,
  ReleaseReviewView,
} from '@/types/releaseReviews'

export const EMPTY_RELEASE_REVIEW_COUNTS: ReleaseReviewCounts = {
  text: 0,
  image: 0,
  contribution: 0,
  allowed_types: [],
  image_categories: {
    screenshot: 0,
    typesetting_karaoke: 0,
    fun_outtake: 0,
    other: 0,
  },
}

export const RELEASE_REVIEW_CATEGORY_LABELS: Record<ReleaseReviewImageCategory, string> = {
  screenshot: 'Screenshot',
  typesetting_karaoke: 'Typesetting / Karaoke',
  fun_outtake: 'Fun / Outtake',
  other: 'Sonstiges',
}

export const RELEASE_REVIEW_REJECTION_CATEGORY_LABELS: Record<ReleaseReviewRejectionCategory, string> = {
  'content.incorrect': 'Inhaltlich falsch',
  'release_context.wrong': 'Falscher Release-Kontext',
  'quality.insufficient': 'Qualität unzureichend',
  'rights.unclear': 'Quelle oder Rechte unklar',
  other: 'Sonstiger Grund',
}

export function readPositiveReviewNumber(value: string | null): number | null {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export function readReviewView(value: string | null): ReleaseReviewView {
  return value === 'history' ? 'history' : 'open'
}

export function readReviewType(value: string | null): ReleaseReviewType | null {
  return value === 'text' || value === 'image' ? value : null
}

export function readReviewCategory(value: string | null): ReleaseReviewImageCategory | null {
  return value === 'screenshot' ||
    value === 'typesetting_karaoke' ||
    value === 'fun_outtake' ||
    value === 'other'
    ? value
    : null
}

export function dedupeReleaseReviews(items: ReleaseReviewQueueItem[]): ReleaseReviewQueueItem[] {
  return Array.from(new Map(items.map((item) => [item.id, item])).values())
}

export function releaseReviewQueueStatus(status: ReleaseReviewQueueItem['status']) {
  switch (status) {
    case 'confirmed':
      return { label: 'Bestätigt', variant: 'success' as const }
    case 'rejected':
      return { label: 'Abgelehnt', variant: 'danger' as const }
    case 'tombstoned':
      return { label: 'Bereinigt', variant: 'muted' as const }
    default:
      return { label: 'In Prüfung', variant: 'warning' as const }
  }
}

export function releaseReviewDetailStatus(status: ReleaseReviewDetail['status']) {
  const queueStatus = releaseReviewQueueStatus(status)
  return status === 'confirmed'
    ? { ...queueStatus, label: 'Bestätigt / Öffentlich' }
    : queueStatus
}

export function releaseReviewResubmissionBadge() {
  return { label: 'Überarbeitet', variant: 'warning' as const }
}

export function formatReleaseReviewDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}
