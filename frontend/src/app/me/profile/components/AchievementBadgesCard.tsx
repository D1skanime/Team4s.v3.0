import { EmptyState, SectionHeader } from '@/components/ui'
import type { MemberBadge } from '@/types/contributions'

import { getMemberBadgePresentation } from '@/components/profile/memberBadgeLabels'
import styles from '../page.module.css'

type BadgeVisibility = MemberBadge['visibility']

type AchievementBadgesCardProps = {
  badges: MemberBadge[]
  disabled: boolean
  pendingBadgeId: number | null
  error?: string | null
  onVisibilityChange: (badgeId: number, visibility: BadgeVisibility) => void
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
            const toggleId = `badge-visibility-${badge.id}`
            const isPending = pendingBadgeId === badge.id
            const presentation = getMemberBadgePresentation(badge.badge_code)
            const Icon = presentation.Icon
            const isPublic = badge.visibility === 'public'

            return (
              <li key={badge.id} className={styles.badgeManagerItem}>
                <div className={styles.badgeManagerCopy}>
                  <span className={styles.badgeIdentity}>
                    <Icon size={16} aria-hidden="true" />
                    <strong>{presentation.label}</strong>
                  </span>
                  <label className={styles.badgeToggle} htmlFor={toggleId}>
                    <input
                      id={toggleId}
                      type="checkbox"
                      checked={isPublic}
                      disabled={disabled || isPending}
                      aria-label={`${presentation.label} öffentlich anzeigen`}
                      onChange={(event) => onVisibilityChange(badge.id, event.target.checked ? 'public' : 'internal')}
                    />
                    <span aria-hidden="true" className={styles.badgeToggleTrack}>
                      <span className={styles.badgeToggleThumb} />
                    </span>
                    <span className={styles.badgeToggleLabel}>{isPublic ? 'Öffentlich' : 'Nur für dich'}</span>
                  </label>
                </div>
                <p className={styles.mutedText}>
                  {isPending ? 'Sichtbarkeit wird gespeichert...' : 'Schaltet diese Auszeichnung auf deinem Profil ein oder aus.'}
                </p>
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
