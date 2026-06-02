import Link from 'next/link'
import { cookies } from 'next/headers'
import type { Metadata } from 'next'

import {
  ApiError,
  AUTH_TOKEN_COOKIE_NAME,
  getMemberProfile,
  getMemberContributions,
  getMyBadges,
  getOwnProfile,
  resolveApiUrl,
} from '@/lib/api'
import { RichTextRenderer } from '@/components/editor'
import { MemberProfileHero } from '@/components/profile/MemberProfileHero'
import { MemberBadgeChips } from '@/components/profile/MemberBadgeChips'
import { MemberRoleTimeline } from '@/components/profile/MemberRoleTimeline'
import { MembershipsSection } from '@/components/profile/MembershipsSection'
import { RecentContributionsSection } from '@/components/profile/RecentContributionsSection'
import { RecentMediaSection } from '@/components/profile/RecentMediaSection'
import { Card } from '@/components/ui'
import type { MemberBadge } from '@/types/contributions'
import type { PublicMemberRoleEntry } from '@/types/contributions'
import type { PublicMemberProfileData } from '@/types/profile'

import { OwnHiddenProfilePreview } from './OwnHiddenProfilePreview'
import { OwnProfileEditLink } from './OwnProfileEditLink'
import styles from './page.module.css'

interface MemberProfilePageProps {
  params:
    | {
        slug: string
      }
    | Promise<{
        slug: string
      }>
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
    if ('data' in response && response.data.noindex) {
      return { robots: { index: false, follow: false } }
    }
  } catch {
    return {}
  }

  return {}
}

function renderNotice(message: string) {
  return (
    <main className={styles.page}>
      <p className={styles.backLink}>
        <Link href="/anime">Zur Anime-Liste</Link>
      </p>
      <div className={styles.errorBox}>{message}</div>
    </main>
  )
}

export default async function MemberProfilePage({ params }: MemberProfilePageProps) {
  const slug = await resolveSlug(params)

  if (!slug) {
    return renderNotice('Ungültiger Member-Slug.')
  }

  const cookieStore = await cookies()
  const token = (
    cookieStore.get(AUTH_TOKEN_COOKIE_NAME)?.value ||
    cookieStore.get('access_token')?.value ||
    ''
  ).trim()

  let profile: PublicMemberProfileData | null = null
  let isHidden = false
  let message: string | null = null

  try {
    const response = await getMemberProfile(slug, token || undefined)
    if ('visible' in response && !response.visible) {
      isHidden = true
    } else if ('data' in response) {
      profile = response.data
    }
  } catch (error) {
    message =
      error instanceof ApiError && error.status === 404
        ? 'Mitglied nicht gefunden.'
        : 'Profil konnte nicht geladen werden.'
  }

  if (isHidden) {
    return (
      <main className={styles.page}>
        <p className={styles.backLink}>
          <Link href="/anime">Zur Anime-Liste</Link>
        </p>
        <OwnHiddenProfilePreview slug={slug} />
      </main>
    )
  }

  if (!profile) {
    return renderNotice(message || 'Profil konnte nicht geladen werden.')
  }

  const avatarURL = resolveApiUrl(profile.avatar?.public_url || '')
  const backgroundImageURL = resolveApiUrl(profile.background_image?.public_url || '')

  // Contributions und Badges laden
  let roleTimeline: PublicMemberRoleEntry[] = []
  let hasUnverified = false
  let badges: MemberBadge[] = []
  let isOwnProfile = false

  try {
    const contributionsData = await getMemberContributions(slug)
    roleTimeline = contributionsData.role_timeline ?? []
    hasUnverified = contributionsData.has_unverified ?? false
  } catch {
    // Keine Contributions — leere Timeline anzeigen
  }

  if (token) {
    try {
      const ownProfileData = await getOwnProfile(token)
      if (ownProfileData.data.member_id === profile.member_id) {
        isOwnProfile = true
        const badgesData = await getMyBadges(token)
        badges = badgesData.badges ?? []
      }
    } catch {
      // Nicht eingeloggt oder Fehler — kein eigenes Profil
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.profileToolbar}>
        <nav className={styles.breadcrumb}>
          <Link href="/anime">Anime</Link>
          <span>&gt;</span>
          <span>Members</span>
          <span>&gt;</span>
          <span>{profile.fansub_name}</span>
        </nav>
        <OwnProfileEditLink publicMemberId={profile.member_id} />
      </div>

      <MemberProfileHero profile={profile} avatarURL={avatarURL} backgroundImageURL={backgroundImageURL} isPublicView={true} isVerified={profile.is_verified} />

      <MemberBadgeChips
        badges={badges}
        isOwnProfile={isOwnProfile}
        token={isOwnProfile ? token : undefined}
      />

      <div className={styles.profileGrid}>
        {profile.member_story_html?.trim() ? (
          <Card variant="section" className={styles.storySection} title="Fansub-Geschichte">
            <RichTextRenderer bodyHtml={profile.member_story_html} editorType="tiptap" contentSchemaVersion={1} />
          </Card>
        ) : null}
        <section className={styles.fullWidthSection}>
          <MembershipsSection memberships={profile.memberships ?? []} />
        </section>
        <section className={styles.fullWidthSection}>
          <MemberRoleTimeline entries={roleTimeline} hasUnverified={hasUnverified} isVerified={profile.is_verified} />
        </section>
        <section className={styles.contentSection}>
          <h2>Letzte Medien</h2>
          <RecentMediaSection items={profile.recent_media ?? []} canView={true} isPublicView={true} />
        </section>
        <section className={styles.contentSection}>
          <h2>Letzte Beiträge</h2>
          <RecentContributionsSection items={profile.recent_contributions ?? []} canView={true} isPublicView={true} />
        </section>
      </div>
    </main>
  )
}
