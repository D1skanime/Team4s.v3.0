'use client'

import Image from 'next/image'

import { EmptyState } from '@/components/ui'
import { classNames } from '@/components/ui/classNames'

import styles from './CoverageMatrix.module.css'

// Katalog-getriebene Rollen: die aufrufende Seite liefert die Reihenfolge.
export type RoleDefinition = {
  code: string
  label: string
  sort_order: number
}

export type CoverageRoleMember = {
  memberId: number
  displayName: string
  avatarUrl?: string | null
}

export type ProjectCoverageRow = {
  animeId: number
  animeTitle: string
  coveredRoleCodes?: string[]
  roleMembersByCode?: Record<string, CoverageRoleMember[]>
}

type Props = {
  roles: RoleDefinition[]
  rows: ProjectCoverageRow[]
  onCellClick?: (animeId: number, roleCode: string) => void
}

export function CoverageMatrix({ roles, rows, onCellClick }: Props) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title="Keine Projekte"
        description="Keine Projekte gefunden."
      />
    )
  }

  return (
    <div className={styles.coverageList}>
      {rows.map((row) => (
        <section key={row.animeId} className={styles.projectCoverage}>
          <div className={styles.projectHeader}>
            <h4>{row.animeTitle}</h4>
          </div>
          <div className={styles.roleGrid}>
            {roles.map((role) => {
              const members = row.roleMembersByCode?.[role.code] ?? []
              const covered = members.length > 0 || Boolean(row.coveredRoleCodes?.includes(role.code))
              const visibleMembers = members.slice(0, 4)
              const hiddenMemberCount = Math.max(0, members.length - visibleMembers.length)

              return (
                <button
                  key={role.code}
                  type="button"
                  className={classNames(
                    styles.roleCard,
                    covered && styles.roleCardCovered,
                  )}
                  onClick={() => onCellClick?.(row.animeId, role.code)}
                  disabled={!onCellClick}
                  aria-label={`${role.label} für ${row.animeTitle} ${covered ? 'bearbeiten' : 'zuweisen'}`}
                >
                  <span className={styles.roleTitle}>{role.label}</span>
                  {members.length > 0 ? (
                    <span
                      className={styles.memberStack}
                      aria-label={members.map((member) => member.displayName).join(', ')}
                    >
                      {visibleMembers.map((member) => (
                        <span
                          key={member.memberId}
                          className={styles.memberAvatar}
                          title={member.displayName}
                        >
                          {member.avatarUrl ? (
                            <Image
                              src={member.avatarUrl}
                              alt=""
                              width={28}
                              height={28}
                              unoptimized
                            />
                          ) : (
                            memberInitials(member.displayName)
                          )}
                        </span>
                      ))}
                      {hiddenMemberCount > 0 ? (
                        <span className={styles.memberOverflow}>+{hiddenMemberCount}</span>
                      ) : null}
                    </span>
                  ) : (
                    <span className={covered ? styles.coveredFallback : styles.roleMissing}>
                      {covered ? 'Besetzt' : 'Fehlt'}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}

function memberInitials(displayName: string): string {
  const words = displayName
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toLocaleUpperCase('de-CH')

  return `${words[0][0] ?? ''}${words[words.length - 1][0] ?? ''}`.toLocaleUpperCase('de-CH')
}

export default CoverageMatrix
