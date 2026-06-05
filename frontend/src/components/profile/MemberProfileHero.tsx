import Image from 'next/image'
import { CalendarDays, Eye, Save } from 'lucide-react'

import { Button, PageHeader } from '@/components/ui'
import type { MemberProfileData, PublicMemberProfileData } from '@/types/profile'

import { VerifiedBadge } from './VerifiedBadge'
import { MemberStatusPill } from './MemberStatusPill'
import { MemberProfileMemorialHero } from './MemberProfileMemorialHero'
import { deriveKnownFor } from './deriveKnownFor'
import type { RoleTimelineEntry } from './deriveKnownFor'
import styles from './profile.module.css'

type MemberProfileHeroProps = {
  profile: MemberProfileData | PublicMemberProfileData
  avatarURL?: string
  backgroundImageURL?: string
  isPublicView?: boolean
  isSaving?: boolean
  canSave?: boolean
  isVerified?: boolean
  /** role_timeline für read-only „Bekannt für"-Ableitung (D-03). Optional — leerer Fallback. */
  roleTimeline?: RoleTimelineEntry[]
}

function getAccountDisplayName(profile: MemberProfileData | PublicMemberProfileData): string {
  return 'account_display_name' in profile ? profile.account_display_name : ''
}

function getYearFromProfileDate(dateValue?: string | null): string {
  const match = /^(\d{4})-\d{2}-\d{2}$/.exec((dateValue || '').trim())
  return match?.[1] || ''
}

function formatPublicActivity(profile: MemberProfileData | PublicMemberProfileData): string {
  const activeFromYear = getYearFromProfileDate(profile.active_from_date)
  const activeUntilYear = getYearFromProfileDate(profile.active_until_date)

  if (profile.is_currently_active) {
    return activeFromYear ? `Aktuell aktiv seit ${activeFromYear}` : 'Aktuell aktiv'
  }
  if (activeFromYear && activeUntilYear) return `Aktiv von ${activeFromYear} bis ${activeUntilYear}`
  if (activeFromYear) return `Aktiv seit ${activeFromYear}`
  if (activeUntilYear) return `Aktiv bis ${activeUntilYear}`
  return ''
}

function getProfileStatus(
  profile: MemberProfileData | PublicMemberProfileData,
): 'active' | 'historical' | 'memorial' | null {
  if ('profile_status' in profile) return profile.profile_status ?? null
  return null
}

export function MemberProfileHero({
  profile,
  avatarURL = '',
  backgroundImageURL = '',
  isPublicView = false,
  isSaving = false,
  canSave = false,
  isVerified = false,
  roleTimeline = [],
}: MemberProfileHeroProps) {
  const accountDisplayName = getAccountDisplayName(profile)
  const displayName = profile.fansub_name || accountDisplayName || 'Mein Profil'
  const avatarLabel = profile.fansub_name || accountDisplayName || 'Profil'
  const publicProfileHref = `/members/${profile.member_id}`
  const publicActivityLabel = isPublicView ? formatPublicActivity(profile) : ''
  const profileStatus = getProfileStatus(profile)

  // „Bekannt für"-Ableitung (D-03 — rein read-only aus role_timeline, kein Schreib-Flow)
  const knownFor = deriveKnownFor(roleTimeline)

  // Memorial-Variante delegieren (D-10) — nur im Public-View für PublicMemberProfileData
  if (isPublicView && profileStatus === 'memorial' && 'profile_status' in profile) {
    return (
      <MemberProfileMemorialHero
        profile={profile as PublicMemberProfileData}
        avatarURL={avatarURL}
        backgroundImageURL={backgroundImageURL}
        knownFor={knownFor}
      />
    )
  }

  return (
    <div className={styles.hero}>
      <PageHeader
        eyebrow={isPublicView ? 'Fansub-Member' : 'Mein Bereich'}
        title={isPublicView ? displayName : 'Mein Profil'}
        actions={
          isPublicView
            ? undefined
            : (
                <>
                  <Button
                    className={styles.heroActionButton}
                    href={publicProfileHref}
                    variant="secondary"
                    leftIcon={<Eye size={16} />}
                  >
                    Öffentliches Profil ansehen
                  </Button>
                  <Button
                    className={styles.heroActionButton}
                    type="submit"
                    form="member-profile-form"
                    loading={isSaving}
                    disabled={!canSave}
                    leftIcon={<Save size={16} />}
                  >
                    Profil speichern
                  </Button>
                </>
              )
        }
      />

      <div
        className={styles.heroPanel}
        style={
          backgroundImageURL
            ? {
                backgroundImage: `linear-gradient(135deg, rgba(31, 41, 55, 0.9), rgba(47, 95, 227, 0.64)), url("${backgroundImageURL}")`,
              }
            : undefined
        }
      >
        <div className={styles.heroAvatar}>
          {avatarURL ? (
            <Image
              src={avatarURL}
              alt={`${avatarLabel} Avatar`}
              width={132}
              height={132}
              unoptimized
            />
          ) : (
            <span aria-hidden="true">
              {(profile.fansub_name || accountDisplayName || '?').slice(0, 1).toUpperCase()}
            </span>
          )}
        </div>
        <div className={styles.heroCopy}>
          <h2 className={styles.heroTitleRow}>
            <span>{displayName}</span>
            {isVerified ? <VerifiedBadge /> : null}
            {isPublicView && profileStatus ? (
              <MemberStatusPill status={profileStatus} />
            ) : null}
          </h2>
          <p>{profile.bio || 'Noch keine Kurzbeschreibung hinterlegt.'}</p>
          {publicActivityLabel ? (
            <span className={styles.heroMetaLine}>
              <CalendarDays size={15} aria-hidden="true" />
              {publicActivityLabel}
            </span>
          ) : null}

          {/* „Bekannt für"-Block (D-03 — read-only, kein Schreib-Flow, kein neues DB-Feld) */}
          {isPublicView && (knownFor.activeYears || knownFor.topRoles.length > 0) ? (
            <div className={styles.knownForBlock}>
              {knownFor.activeYears ? (
                <span className={styles.knownForItem}>
                  Aktiv: {knownFor.activeYears}
                </span>
              ) : null}
              {knownFor.topRoles.length > 0 ? (
                <span className={styles.knownForItem}>
                  Schwerpunkte: {knownFor.topRoles.join(', ')}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
