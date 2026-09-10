'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
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

function getPublicProfileHref(profile: MemberProfileData | PublicMemberProfileData): string | null {
  return profile.slug ? `/members/${profile.slug}` : null
}

function getYearFromProfileDate(dateValue?: string | null): string {
  const match = /^(\d{4})-\d{2}-\d{2}$/.exec((dateValue || '').trim())
  return match?.[1] || ''
}

// resolveActivityYear liefert das Anzeige-Jahr mit Praezisions-Vorrang (D-02): ein volles
// Datum gewinnt, sonst greift die jahr-genaue Angabe. So wird eine reine Jahresperiode
// (z. B. "2015-2019") korrekt gezeigt, ohne ein Datum zu erfinden.
function resolveActivityYear(dateValue?: string | null, yearValue?: number | null): string {
  const fromDate = getYearFromProfileDate(dateValue)
  if (fromDate) return fromDate
  if (typeof yearValue === 'number' && Number.isFinite(yearValue)) return String(yearValue)
  return ''
}

function formatPublicActivity(profile: MemberProfileData | PublicMemberProfileData): string {
  const activeFromYear = resolveActivityYear(profile.active_from_date, profile.active_from_year)
  const activeUntilYear = resolveActivityYear(profile.active_until_date, profile.active_until_year)

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

// getKnownFor liest das server-autoritative known_for-Aggregat direkt vom DTO (PMFE-06/PMFE-11,
// Phase 132 Plan 01). Es darf NIE wieder aus current_projects (nur die erste paginierte Seite)
// re-aggregiert werden -- das war der urspruengliche PMFE-11-Datenfehler.
function getKnownFor(profile: MemberProfileData | PublicMemberProfileData): KnownForResult {
  if (!('known_for' in profile)) return { activeYears: '', topRoles: [], knownGroups: [] }

  return {
    activeYears: profile.known_for.active_years,
    topRoles: profile.known_for.top_roles,
    knownGroups: profile.known_for.known_groups,
  }
}

function isGifAvatarURL(avatarURL: string): boolean {
  return /\.gif(?:$|\?)/i.test(avatarURL)
}

function isWebpAvatarURL(avatarURL: string): boolean {
  return /\.webp(?:$|\?)/i.test(avatarURL)
}

// isAnimatedWebpSource extends the pre-existing GIF-only isAnimatedAvatar precedent
// (P154-07, RCA-06 Workstream B3) to animated WebP. Root cause, empirically confirmed
// against this exact deployment (`^16.1.6`): a direct `/_next/image?url=<timer's
// avatar>&w=160&q=75` request returns the SAME 411,828-byte content-length as the raw
// original file -- Next.js's own built-in image loader auto-detects animated GIF/APNG/
// WebP and bypasses resizing entirely regardless of the requested `w=`
// (nextjs.org/docs/app/api-reference/components/image), which is documented, intentional
// Next.js behavior, not a client-set `unoptimized` prop (this component's normal
// ResponsiveImage branch never sets `unoptimized`) and not a bug in this codebase.
//
// No backend derivative-generation service exists for avatar uploads
// (`media_service.go` has no `imaging.Resize` call), so there is no smaller same-origin
// derivative to request instead. The chosen mechanism is a lightweight client-side probe:
// fetch a small byte range of the same-origin avatar source the <img> is already loading
// (T-154-B3-01: same asset, no additional private data exposed) and check for the WebP
// RIFF container's ANIM chunk signature, which marks the file as animated. If detected,
// the avatar is rendered through the SAME existing unoptimized <Image> branch GIFs
// already use (never a second, parallel branch) -- this puts it on Next's real escape
// hatch (unoptimized, browser-native decoding) instead of the optimizer's silent,
// unbounded auto-bypass.
async function isAnimatedWebpSource(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { headers: { Range: 'bytes=0-63' } })
    // WR-01 (154-REVIEW.md): only trust a genuine 206 before reading the body -- a 200 means
    // the media route did not honor Range (quick task 260910-s1b), so treat it as
    // not-animated/unknown instead of silently downloading the full file.
    if (!response.ok || response.status !== 206) return false
    const buffer = new Uint8Array(await response.arrayBuffer())
    let signature = ''
    for (const byte of buffer) signature += String.fromCharCode(byte)
    return signature.includes('RIFF') && signature.includes('WEBP') && signature.includes('ANIM')
  } catch {
    return false
  }
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
  const knownFor = getKnownFor(profile)
  const totalPoints = getTotalPoints(profile)

  // isGifAvatarURL is a pure, synchronous function of avatarURL, so its result is derived
  // directly during render (React's documented "adjusting state when a prop changes"
  // pattern) rather than via a synchronous setState-in-effect, which
  // react-hooks/set-state-in-effect correctly flags as cascading-render-prone. Only the
  // ASYNC WebP probe below needs a real effect (it sets state later, from a callback, in
  // response to an external fetch -- the effect pattern the rule endorses).
  const [webpProbeState, setWebpProbeState] = useState(() => ({
    avatarURL,
    animated: isGifAvatarURL(avatarURL),
  }))
  const resolvedWebpProbeState = webpProbeState.avatarURL === avatarURL
    ? webpProbeState
    : { avatarURL, animated: isGifAvatarURL(avatarURL) }
  if (resolvedWebpProbeState !== webpProbeState) setWebpProbeState(resolvedWebpProbeState)
  const isAnimatedAvatar = resolvedWebpProbeState.animated

  // Wave-safe default: while the async WebP probe is pending, keep rendering the normal
  // ResponsiveImage branch (never speculatively swap to the unoptimized branch) -- no
  // flash/swap for the common static-image case, and GIFs stay synchronously correct
  // (handled above, without waiting for this effect).
  useEffect(() => {
    if (isGifAvatarURL(avatarURL) || !avatarURL || !isWebpAvatarURL(avatarURL)) return

    let cancelled = false
    isAnimatedWebpSource(avatarURL).then((animated) => {
      if (cancelled || !animated) return
      setWebpProbeState((previous) => (
        previous.avatarURL === avatarURL ? { avatarURL, animated: true } : previous
      ))
    })
    return () => {
      cancelled = true
    }
  }, [avatarURL])

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
              {publicProfileHref ? (
              <Button
                className={styles.heroActionButton}
                href={publicProfileHref}
                variant="secondary"
                leftIcon={<Eye size={16} />}
              >
                Öffentliches Profil ansehen
              </Button>
              ) : null}
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
