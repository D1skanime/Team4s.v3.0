import Image from 'next/image'
import { CalendarDays, Eye, Save } from 'lucide-react'

import { Button, HeroMetrics, PageHeader } from '@/components/ui'
import type { MemberProfileData, PublicMemberProfileData } from '@/types/profile'

import { VerifiedBadge } from './VerifiedBadge'
import { MemberStatusPill } from './MemberStatusPill'
import { MemberProfileMemorialHero } from './MemberProfileMemorialHero'
import type { KnownForResult } from './deriveKnownFor'
import styles from './profile.module.css'

type MemberProfileHeroProps = {
  profile: MemberProfileData | PublicMemberProfileData
  avatarURL?: string
  backgroundImageURL?: string
  isPublicView?: boolean
  isSaving?: boolean
  canSave?: boolean
  isVerified?: boolean
}

function getAccountDisplayName(profile: MemberProfileData | PublicMemberProfileData): string {
  return 'account_display_name' in profile ? profile.account_display_name : ''
}

function getPublicProfileHref(profile: MemberProfileData | PublicMemberProfileData): string {
  const slug = 'slug' in profile ? profile.slug : ''
  return `/members/${slug || profile.member_id}`
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

function getTotalPoints(profile: MemberProfileData | PublicMemberProfileData): number | null {
  return 'total_points' in profile ? profile.total_points : null
}

function deriveKnownForFromPublicProfile(profile: MemberProfileData | PublicMemberProfileData): KnownForResult {
  if (!('current_projects' in profile)) return { activeYears: '', topRoles: [], knownGroups: [] }

  const roles = new Map<string, number>()
  for (const project of profile.current_projects ?? []) {
    for (const role of project.roles ?? []) {
      const label = role.trim()
      if (!label) continue
      roles.set(label, (roles.get(label) ?? 0) + 1)
    }
  }

  const topRoles = Array.from(roles.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'de'))
    .slice(0, 3)
    .map(([role]) => role)

  return { activeYears: '', topRoles, knownGroups: [] }
}

export function MemberProfileHero({
  profile,
  avatarURL = '',
  backgroundImageURL = '',
  isPublicView = false,
  isSaving = false,
  canSave = false,
  isVerified = false,
}: MemberProfileHeroProps) {
  const accountDisplayName = getAccountDisplayName(profile)
  const displayName = profile.fansub_name || accountDisplayName || 'Mein Profil'
  const avatarLabel = profile.fansub_name || accountDisplayName || 'Profil'
  const publicProfileHref = getPublicProfileHref(profile)
  const publicActivityLabel = isPublicView ? formatPublicActivity(profile) : ''
  const profileStatus = getProfileStatus(profile)
  const knownFor = deriveKnownForFromPublicProfile(profile)
  const totalPoints = getTotalPoints(profile)

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
                    variant="success"
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
      >
        {backgroundImageURL ? (
          <div className={styles.heroBackdrop} aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={backgroundImageURL} alt="" />
          </div>
        ) : null}
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
          {isPublicView && totalPoints !== null ? (
            <HeroMetrics items={[{ label: 'Punkte', value: totalPoints }]} ariaLabel="Mitglied-Punktzahl" />
          ) : null}
          {profile.bio ? (
            <p>{profile.bio}</p>
          ) : !isPublicView ? (
            <p>Noch keine Kurzbeschreibung hinterlegt.</p>
          ) : null}
          {publicActivityLabel ? (
            <span className={styles.heroMetaLine}>
              <CalendarDays size={15} aria-hidden="true" />
              {publicActivityLabel}
            </span>
          ) : null}

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
