import { Badge, EmptyState, FormField, Select, SectionHeader } from '@/components/ui'
import type { MemberBadge } from '@/types/contributions'

import { formatMemberBadgeLabel } from '@/components/profile/memberBadgeLabels'
import styles from '../page.module.css'

type BadgeVisibility = MemberBadge['visibility']

type AchievementBadgesCardProps = {
  badges: MemberBadge[]
  disabled: boolean
  pendingBadgeId: number | null
  error?: string | null
  onVisibilityChange: (badgeId: number, visibility: BadgeVisibility) => void
}

const VISIBILITY_LABELS: Record<BadgeVisibility, string> = {
  public: 'Öffentlich',
  internal: 'Nur intern',
  hidden: 'Ausgeblendet',
}

function visibilityVariant(visibility: BadgeVisibility): 'success' | 'info' | 'muted' {
  if (visibility === 'public') return 'success'
  if (visibility === 'internal') return 'info'
  return 'muted'
}

export function AchievementBadgesCard({
  badges,
  disabled,
  pendingBadgeId,
  error,
  onVisibilityChange,
}: AchievementBadgesCardProps) {
  return (
    <div className={styles.badgeManager}>
      <SectionHeader
        title="Erfolgs-Badges"
        description="Steuere hier, welche Auszeichnungen auf deinem öffentlichen Profil sichtbar sind."
      />

      {badges.length === 0 ? (
        <EmptyState variant="compact" title="Noch keine Badges" description="Sobald du Auszeichnungen erhältst, kannst du ihre Sichtbarkeit hier ändern." />
      ) : (
        <ul className={styles.badgeManagerList}>
          {badges.map((badge) => {
            const selectId = `badge-visibility-${badge.id}`
            const isPending = pendingBadgeId === badge.id

            return (
              <li key={badge.id} className={styles.badgeManagerItem}>
                <div className={styles.badgeManagerCopy}>
                  <strong>{formatMemberBadgeLabel(badge.badge_code)}</strong>
                  <Badge variant={visibilityVariant(badge.visibility)}>{VISIBILITY_LABELS[badge.visibility]}</Badge>
                </div>
                <FormField label="Sichtbarkeit" htmlFor={selectId} disabled={disabled || isPending}>
                  <Select
                    id={selectId}
                    value={badge.visibility}
                    disabled={disabled || isPending}
                    onChange={(event) => onVisibilityChange(badge.id, event.target.value as BadgeVisibility)}
                  >
                    <option value="public">Öffentlich anzeigen</option>
                    <option value="internal">Nur für mich anzeigen</option>
                    <option value="hidden">Ausblenden</option>
                  </Select>
                </FormField>
              </li>
            )
          })}
        </ul>
      )}

      {error ? (
        <p role="alert" className={styles.inlineError}>
          {error}
        </p>
      ) : null}
    </div>
  )
}
