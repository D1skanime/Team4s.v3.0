import Link from 'next/link'

import { VerifiedBadge } from '@/components/profile/VerifiedBadge'

import styles from './archive.module.css'

// Leserliche Rollentexte für die Chip-Anzeige (D-17: Deutsch mit Umlauten)
const ROLE_LABELS: Record<string, string> = {
  translator: 'Übersetzung',
  editor: 'Editing',
  timer: 'Timing',
  typesetter: 'Typesetting',
  encoder: 'Encoding',
  raw_provider: 'Raw Provider',
  quality_checker: 'Qualitätskontrolle',
  project_lead: 'Projektleitung',
  designer: 'Design',
  admin: 'Administration',
  other: 'Sonstiges',
}

type MemberSearchCardProps = {
  id: number
  nickname: string
  displayName: string
  slug: string | null
  avatarPath: string | null
  isVerified: boolean
  topRoles: string[]
  groups: string[]
}

export function MemberSearchCard({
  displayName,
  slug,
  avatarPath,
  isVerified,
  topRoles,
  groups,
}: MemberSearchCardProps) {
  const visibleRoles = topRoles.slice(0, 3)
  const extraRoles = topRoles.length - visibleRoles.length
  const visibleGroups = groups.slice(0, 2)
  const extraGroups = groups.length - visibleGroups.length

  return (
    <article className={styles.memberSearchCard}>
      <div className={styles.cardHeader}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarPath ?? '/placeholder-avatar.png'}
          alt={displayName}
          className={styles.cardAvatar}
          width={48}
          height={48}
        />
        <div className={styles.cardMeta}>
          <strong className={styles.cardName}>{displayName}</strong>
          {isVerified && <VerifiedBadge />}
        </div>
      </div>

      {topRoles.length > 0 && (
        <div className={styles.cardRoles}>
          {visibleRoles.map((role) => (
            <span key={role} className={styles.roleChip}>
              {ROLE_LABELS[role] ?? role}
            </span>
          ))}
          {extraRoles > 0 && (
            <span className={styles.roleChip}>+{extraRoles} weitere</span>
          )}
        </div>
      )}

      {groups.length > 0 && (
        <div className={styles.cardGroups}>
          {visibleGroups.join(', ')}
          {extraGroups > 0 && ` + ${extraGroups} weitere`}
        </div>
      )}

      {slug && (
        <Link href={`/members/${slug}`} className={styles.cardLink}>
          Profil ansehen
        </Link>
      )}
    </article>
  )
}
