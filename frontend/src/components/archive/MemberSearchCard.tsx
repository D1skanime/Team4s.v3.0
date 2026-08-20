'use client'

import Link from 'next/link'

import { VerifiedBadge } from '@/components/profile/VerifiedBadge'
import { labelForRole } from '@/lib/roleCatalog'
import { useRoleCatalog } from '@/providers/RoleCatalogProvider'

import styles from './archive.module.css'

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
  const { roles: contributionRoles } = useRoleCatalog('anime_contribution')
  const { roles: historyRoles } = useRoleCatalog('group_history')
  const catalogRoles = Array.from(new Map(
    [...contributionRoles, ...historyRoles].map((role) => [role.code, role]),
  ).values())
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
              {labelForRole(catalogRoles, role)}
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
