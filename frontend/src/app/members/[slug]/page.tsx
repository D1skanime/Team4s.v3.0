import Link from 'next/link'
import { cookies } from 'next/headers'
import type { Metadata } from 'next'

import {
  ApiError,
  AUTH_TOKEN_COOKIE_NAME,
  getMemberProfile,
  getMemberContributions,
  resolveApiUrl,
} from '@/lib/api'
import { Card } from '@/components/ui'
import { MemberProfileHero } from '@/components/profile/MemberProfileHero'
import { MemberGroupsHistorySection } from '@/components/profile/MemberGroupsHistorySection'
import { MemberSectionNav } from '@/components/profile/MemberSectionNav'
import { MemberBadgeHighlights } from '@/components/profile/MemberBadgeHighlights'
import { MemberContributionFilters } from '@/components/profile/MemberContributionFilters'
import { MemberRoleTimeline } from '@/components/profile/MemberRoleTimeline'
import type { PublicMemberRoleEntry } from '@/types/contributions'
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

  let roleTimeline: PublicMemberRoleEntry[] = []
  try {
    const contributionsData = await getMemberContributions(slug)
    roleTimeline = contributionsData.role_timeline ?? []
  } catch { /* Keine Contributions — leere Timeline */ }

  // Badges aus DTO (public_badges) — kein getMyBadges (Fallstrick 2, Badges-13)
  const publicBadges = profile.public_badges ?? []

  return (
    <main className={styles.page}>
      <div className={styles.profileToolbar}>
        <nav className={styles.breadcrumb}>
          <Link href="/anime">Anime</Link>
          <span>&gt;</span><span>Members</span><span>&gt;</span>
          <span>{profile.fansub_name}</span>
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <OwnProfileEditLink publicMemberId={profile.member_id} />
          {/* CorrectionReportModal: nur für eingeloggte User sichtbar (via useAuthSession, D-18) */}
          <CorrectionReportModal memberId={profile.member_id} memberName={profile.fansub_name} />
        </div>
      </div>

      <MemberSectionNav />

      {/* #identitaet — Hero (D-02 Reihenfolge) */}
      <section id="identitaet" className={styles.section}>
        <MemberProfileHero
          profile={profile} avatarURL={avatarURL} backgroundImageURL={backgroundImageURL}
          isPublicView={true} isVerified={profile.is_verified} roleTimeline={roleTimeline}
        />
      </section>

      {/* #badges — Badge-Highlights (D-11, D-10) */}
      <section id="badges" className={styles.section}>
        <Card variant="section" title="Badges">
          <MemberBadgeHighlights
            publicBadges={publicBadges}
            isMemorial={profile.profile_status === 'memorial'}
          />
        </Card>
      </section>

      {/* #geschichte — Gruppen & Geschichte (D-02) */}
      <section id="geschichte" className={styles.section}>
        <MemberGroupsHistorySection memberships={profile.memberships ?? []} storyHtml={profile.member_story_html} />
      </section>

      {/* #beitraege — Filterbare Contributions (D-06/D-07/D-08) */}
      <section id="beitraege" className={styles.section}>
        <Card variant="section" title="Beiträge">
          {roleTimeline.length > 0
            ? <MemberContributionFilters roleTimeline={roleTimeline} />
            : <MemberRoleTimeline entries={[]} hasUnverified={false} isVerified={profile.is_verified} />}
        </Card>
      </section>
    </main>
  )
}
