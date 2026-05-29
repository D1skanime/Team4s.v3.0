import Link from 'next/link'
import { cookies } from 'next/headers'

import {
  ApiError,
  AUTH_TOKEN_COOKIE_NAME,
  getMemberProfile,
  resolveApiUrl,
} from '@/lib/api'
import { MemberProfileHero } from '@/components/profile/MemberProfileHero'
import { MembershipsSection } from '@/components/profile/MembershipsSection'
import { RecentContributionsSection } from '@/components/profile/RecentContributionsSection'
import { RecentMediaSection } from '@/components/profile/RecentMediaSection'
import type { PublicMemberProfileData } from '@/types/profile'

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
  const resolvedParams = await params
  const slug = (resolvedParams.slug || '').trim()

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
    return renderNotice('Dieses Profil ist nicht öffentlich zugänglich.')
  }

  if (!profile) {
    return renderNotice(message || 'Profil konnte nicht geladen werden.')
  }

  const avatarURL = resolveApiUrl(profile.avatar?.public_url || '')
  const backgroundImageURL = resolveApiUrl(profile.background_image?.public_url || '')

  return (
    <main className={styles.page}>
      <nav className={styles.breadcrumb}>
        <Link href="/anime">Anime</Link>
        <span>&gt;</span>
        <span>Members</span>
        <span>&gt;</span>
        <span>{profile.fansub_name}</span>
      </nav>

      <MemberProfileHero profile={profile} avatarURL={avatarURL} backgroundImageURL={backgroundImageURL} isPublicView={true} />
      <div className={styles.profileGrid}>
        <section className={styles.fullWidthSection}>
          <MembershipsSection memberships={profile.memberships ?? []} />
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
