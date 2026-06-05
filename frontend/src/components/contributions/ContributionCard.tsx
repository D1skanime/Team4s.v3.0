'use client'

import { Badge, Button, Card } from '@/components/ui'
import type { MeAnimeContribution } from '@/types/contributions'

import styles from './contributions.module.css'
import { VisibilityDropdown } from './VisibilityDropdown'

interface ContributionCardProps {
  contribution: MeAnimeContribution
  mode: 'confirmed' | 'pending' | 'proposal'
  onConfirm?: (id: number) => void
  onReject?: (id: number) => void
  onVisibilityChange?: (id: number, isPublic: boolean) => void
}

const ROLE_LABELS: Record<string, string> = {
  translator: 'Übersetzung',
  editor: 'Editing',
  timer: 'Timing',
  typesetter: 'Typesetting / FX',
  typesetting: 'Typesetting / FX',
  encoder: 'Encoding',
  encoding: 'Encoding',
  raw_provider: 'Raw-Bereitstellung',
  quality_checker: 'Qualitätsprüfung',
  project_lead: 'Projektleitung',
  project_manager: 'Projektmanagement',
  designer: 'Design',
  admin: 'Administration',
  leader: 'Gruppenleitung',
  founder: 'Gründer/in',
  other: 'Sonstiges',
}

function roleLabel(code: string): string {
  return ROLE_LABELS[code] ?? code
}

function yearRange(startedYear?: number | null, endedYear?: number | null): string | null {
  if (startedYear && endedYear) return `${startedYear}-${endedYear}`
  if (startedYear) return `ab ${startedYear}`
  if (endedYear) return `bis ${endedYear}`
  return null
}

export function ContributionCard({
  contribution,
  mode,
  onConfirm,
  onReject,
  onVisibilityChange,
}: ContributionCardProps) {
  const {
    id,
    anime_id,
    anime_title,
    role_codes,
    role_labels,
    started_year,
    ended_year,
    is_public_on_member_profile,
    status,
    review_note,
  } = contribution
  const title = anime_title?.trim() || `Anime #${anime_id}`
  const years = yearRange(started_year, ended_year)

  return (
    <Card variant="nestedFlat" className={styles.contributionCard}>
      <div className={styles.contributionCardHeader}>
        <div>
          <div className={styles.contributionTitleRow}>
            <span className={styles.contributionTitle}>{title}</span>
            {years ? <span className={styles.metaText}>{years}</span> : null}
          </div>
        </div>

        {mode === 'confirmed' && onVisibilityChange ? (
          <VisibilityDropdown
            contributionId={id}
            isPublic={is_public_on_member_profile}
            onChanged={(isPublic) => onVisibilityChange(id, isPublic)}
          />
        ) : null}
      </div>

      {role_codes.length > 0 ? (
        <div className={styles.roleList}>
          {role_codes.map((code, index) => (
            <Badge key={`${code}-${index}`} variant="info">
              {role_labels?.[index] || roleLabel(code)}
            </Badge>
          ))}
        </div>
      ) : null}

      {mode === 'proposal' && status === 'disputed' && review_note ? (
        <p className={styles.reviewNote}>
          <strong>Ablehngrund:</strong> {review_note}
        </p>
      ) : null}

      {mode === 'pending' ? (
        <div className={styles.actionsRow}>
          {onConfirm ? (
            <Button size="sm" variant="success" onClick={() => onConfirm(id)}>
              Bestätigen
            </Button>
          ) : null}
          {onReject ? (
            <Button size="sm" variant="danger" onClick={() => onReject(id)}>
              Ablehnen
            </Button>
          ) : null}
        </div>
      ) : null}
    </Card>
  )
}
