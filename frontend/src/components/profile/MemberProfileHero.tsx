import Image from 'next/image'
import { CalendarDays, Eye, Save } from 'lucide-react'

import { Button, HeroMetrics, PageHeader } from '@/components/ui'
import { ResponsiveImage } from '@/components/ui/ResponsiveImage'
import type { MemberProfileData, PublicMemberBadge, PublicMemberProfileData } from '@/types/profile'

import { resolveBadgeArtwork } from './badgeArtwork'
import { getMemberBadgePresentation, PUBLIC_MEMBER_BADGE_CATALOG } from './memberBadgeLabels'
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
  publicBadges?: PublicMemberBadge[]
}

const HEADER_SPECIAL_CODES = new Set(['historical_leader', 'all_rounder'])

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
  publicBadges = [],
}: MemberProfileHeroProps) {
  const accountDisplayName = getAccountDisplayName(profile)
  const displayName = profile.fansub_name || accountDisplayName || 'Mein Profil'
  const avatarLabel = profile.fansub_name || accountDisplayName || 'Profil'
  const publicProfileHref = getPublicProfileHref(profile)
  const publicActivityLabel = isPublicView ? formatPublicActivity(profile) : ''
  const profileStatus = getProfileStatus(profile)
  const knownFor = deriveKnownForFromPublicProfile(profile)
  const totalPoints = getTotalPoints(profile)
  const isAnimatedAvatar = /\.gif(?:$|\?)/i.test(avatarURL)
  const earnedCodes = new Set(publicBadges.map((badge) => badge.badge_code))
  const specialAwards = PUBLIC_MEMBER_BADGE_CATALOG
    .filter((item) => HEADER_SPECIAL_CODES.has(item.badge_code) && earnedCodes.has(item.badge_code))
    .map((item) => ({ ...item, presentation: getMemberBadgePresentation(item.badge_code) }))

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
      {!isPublicView ? (
        <PageHeader
          eyebrow="Mein Bereich"
          title="Mein Profil"
          actions={(
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
          )}
        />
      ) : null}

      <div
        className={styles.heroPanel}
        data-testid="member-profile-hero-panel"
      >
        {backgroundImageURL ? (
          <div className={styles.heroBackdrop} aria-hidden="true">
            <ResponsiveImage
              src={backgroundImageURL}
              alt=""
              fill
              sizes="(max-width: 760px) calc(100vw - 24px), (max-width: 1099px) calc(100vw - 48px), 1360px"
              loading="eager"
              fetchPriority="high"
            />
          </div>
        ) : null}
        <div className={styles.heroAvatar}>
          {avatarURL && isAnimatedAvatar ? (
            <Image
              src={avatarURL}
              alt={`${avatarLabel} Avatar`}
              width={140}
              height={140}
              sizes="(max-width: 760px) 100px, (max-width: 1099px) 120px, 140px"
              loading="eager"
              unoptimized
            />
          ) : avatarURL ? (
            <ResponsiveImage
              src={avatarURL}
              alt={`${avatarLabel} Avatar`}
              width={140}
              height={140}
              sizes="(max-width: 760px) 100px, (max-width: 1099px) 120px, 140px"
              loading="eager"
            />
          ) : (
            <span aria-hidden="true">
              {(profile.fansub_name || accountDisplayName || '?').slice(0, 1).toUpperCase()}
            </span>
          )}
        </div>
        <div className={styles.heroCopy}>
          {isPublicView ? <p className={styles.heroEyebrow}>Fansub-Member</p> : null}
          <div className={styles.heroTitleRow}>
            {isPublicView ? (
              <h1 className={styles.heroTitle}>{displayName}</h1>
            ) : (
              <h2 className={styles.heroTitle}>{displayName}</h2>
            )}
            {isVerified ? (
              <span className={styles.heroStatusSurface}><VerifiedBadge /></span>
            ) : null}
            {isPublicView && profileStatus ? (
              <MemberStatusPill status={profileStatus} />
            ) : null}
          </div>
          {isPublicView && totalPoints !== null ? (
            <HeroMetrics
              className={styles.heroPoints}
              items={[{ label: 'Punkte', value: totalPoints }]}
              ariaLabel="Mitglied-Punktzahl"
            />
          ) : null}
          {profile.bio ? (
            <p className={styles.heroBio}>{profile.bio}</p>
          ) : !isPublicView ? (
            <p className={styles.heroBio}>Noch keine Kurzbeschreibung hinterlegt.</p>
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
          {specialAwards.length > 0 ? (
            <ul className={styles.heroSpecialAwardsList} aria-label="Besondere Auszeichnungen">
              {specialAwards.map((award) => {
                const artwork = resolveBadgeArtwork(award.badge_code)
                const Icon = award.presentation.Icon
                return (
                  <li className={styles.heroSpecialAward} key={award.badge_code}>
                    <span className={styles.heroSpecialArtwork} aria-hidden="true">
                      {artwork ? <ResponsiveImage src={artwork} alt="" width={40} height={40} sizes="40px" /> : <Icon size={24} data-special-award-icon={award.badge_code} />}
                    </span>
                    <span>{award.presentation.label}</span>
                  </li>
                )
              })}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  )
}
