import Link from 'next/link'
import { cookies } from 'next/headers'
import type { Metadata } from 'next'

import {
  ApiError,
  AUTH_TOKEN_COOKIE_NAME,
  getMemberProfile,
  resolveApiUrl,
} from '@/lib/api'
import { MemberProfileHero } from '@/components/profile/MemberProfileHero'
import { MembershipsSection } from '@/components/profile/MembershipsSection'
import { MemberCurrentProjectsSection } from '@/components/profile/MemberCurrentProjectsSection'
import { MemberBadgeChain } from '@/components/profile/MemberBadgeChain'
import { LatestContributionsSection } from '@/components/profile/LatestContributionsSection'
import { MemberStorySection } from '@/components/profile/MemberStorySection'
import { PreviousContributionsSection } from '@/components/profile/PreviousContributionsSection'
import { PUBLIC_MEMBER_BADGE_CATALOG, deriveMilestoneBadge } from '@/components/profile/memberBadgeLabels'
import type { PublicMemberProfileData } from '@/types/profile'

import { CorrectionReportModal } from '@/components/profile/CorrectionReportModal'
import { OwnHiddenProfilePreview } from './OwnHiddenProfilePreview'
import { OwnProfileEditLink } from './OwnProfileEditLink'
import styles from './page.module.css'

interface MemberProfilePageProps {
  params: { slug: string } | Promise<{ slug: string }>
}

async function resolveSlug(params: MemberProfilePageProps['params']): Promise<string> {
  const resolvedParams = await params
  return (resolvedParams.slug || '').trim()
}

export async function generateMetadata({ params }: MemberProfilePageProps): Promise<Metadata> {
  const slug = await resolveSlug(params)
  if (!slug) return {}
  try {
    const response = await getMemberProfile(slug)
    if ('data' in response && response.data.noindex) return { robots: { index: false, follow: false } }
  } catch { return {} }
  return {}
}

function renderNotice(message: string) {
  return (
    <main className={styles.page}>
      <p className={styles.backLink}><Link href="/anime">Zur Anime-Liste</Link></p>
      <div className={styles.errorBox}>{message}</div>
    </main>
  )
}

export default async function MemberProfilePage({ params }: MemberProfilePageProps) {
  const slug = await resolveSlug(params)
  if (!slug) return renderNotice('Ungültiger Member-Slug.')

  const cookieStore = await cookies()
  const token = (
    cookieStore.get(AUTH_TOKEN_COOKIE_NAME)?.value ||
    cookieStore.get('access_token')?.value || ''
  ).trim()

  let profile: PublicMemberProfileData | null = null
  let isHidden = false
  let message: string | null = null

  try {
    const response = await getMemberProfile(slug, token || undefined)
    if ('visible' in response && !response.visible) isHidden = true
    else if ('data' in response) profile = response.data
  } catch (error) {
    message = error instanceof ApiError && error.status === 404
      ? 'Mitglied nicht gefunden.'
      : 'Profil konnte nicht geladen werden.'
  }

  if (isHidden) {
    return (
      <main className={styles.page}>
        <p className={styles.backLink}><Link href="/anime">Zur Anime-Liste</Link></p>
        <OwnHiddenProfilePreview slug={slug} />
      </main>
    )
  }
  if (!profile) return renderNotice(message || 'Profil konnte nicht geladen werden.')

  const avatarURL = resolveApiUrl(profile.avatar?.public_url || '')
  const backgroundImageURL = resolveApiUrl(profile.background_image?.public_url || '')
  const publicBadges = profile.public_badges ?? []
  // Phase 112 D-01/D-02/D-03: hoechster erreichter Punkt-Meilenstein wird bei jedem SSR-Render
  // frisch aus total_points abgeleitet (Live-Rueckstufung ohne Persistenz, GAM-04) und additiv
  // in earnedBadges gemischt; MemberBadgeChain selbst bleibt ohne total_points-Kenntnis.
  const milestoneBadge = deriveMilestoneBadge(profile.total_points ?? 0)
  const earnedBadges = milestoneBadge ? [...publicBadges, milestoneBadge] : publicBadges
  const currentProjects = profile.current_projects ?? []
  const latestContributions = profile.latest_contributions ?? []
  const previousContributions = profile.previous_contributions ?? []
  const previousContributionsCount = profile.previous_contributions_count ?? previousContributions.length

  return (
    <main className={styles.page}>
      <div className={styles.profileToolbar}>
        <nav className={styles.breadcrumb}>
          <Link href="/anime">Anime</Link>
          <span>&gt;</span><span>Members</span><span>&gt;</span>
          <span>{profile.fansub_name}</span>
        </nav>
        <div className={styles.toolbarActions}>
          <OwnProfileEditLink publicMemberId={profile.member_id} />
          <CorrectionReportModal memberId={profile.member_id} memberName={profile.fansub_name} />
        </div>
      </div>

      <section className={styles.section} aria-label="Profilkopf">
        <MemberProfileHero
          profile={profile}
          avatarURL={avatarURL}
          backgroundImageURL={backgroundImageURL}
          isPublicView={true}
          isVerified={profile.is_verified}
        />
      </section>

      <section className={styles.section} aria-label="Fansub-Geschichte">
        <MemberStorySection storyHtml={profile.member_story_html} />
      </section>

      <section className={styles.section} aria-label="Gruppenzugehörigkeit">
        <MembershipsSection
          memberships={profile.memberships ?? []}
          title="Gruppenzugehörigkeit"
        />
      </section>

      <section className={styles.section} aria-label="Aktuelle Projekte">
        <MemberCurrentProjectsSection
          memberSlug={slug}
          projects={currentProjects}
          totalCount={profile.current_projects_count ?? currentProjects.length}
        />
      </section>

      <section className={styles.section} aria-label="Auszeichnungen">
        <MemberBadgeChain
          earnedBadges={earnedBadges}
          catalog={PUBLIC_MEMBER_BADGE_CATALOG}
        />
      </section>

      <section className={styles.section} aria-label="Letzte Beiträge">
        <LatestContributionsSection items={latestContributions} />
      </section>

      <section className={styles.section} aria-label="Frühere Mitwirkungen">
        <PreviousContributionsSection
          items={previousContributions}
          totalCount={previousContributionsCount}
        />
      </section>
    </main>
  )
}
