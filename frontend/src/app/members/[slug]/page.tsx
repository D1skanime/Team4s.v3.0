import Link from 'next/link'
import { cache } from 'react'
import { cookies } from 'next/headers'
import type { Metadata } from 'next'

import {
  ApiError,
  AUTH_TOKEN_COOKIE_NAME,
  getMemberProfile,
} from '@/lib/api'
import type { PublicMemberProfileData, PublicMemberViewer } from '@/types/profile'

import { MemberProfileContent } from './MemberProfileContent'
import { OwnHiddenProfilePreview } from './OwnHiddenProfilePreview'
import styles from './page.module.css'

interface MemberProfilePageProps {
  params: { slug: string } | Promise<{ slug: string }>
}

async function resolveSlug(params: MemberProfilePageProps['params']): Promise<string> {
  const resolvedParams = await params
  return (resolvedParams.slug || '').trim()
}

async function readViewerToken(): Promise<string> {
  const cookieStore = await cookies()
  return (
    cookieStore.get(AUTH_TOKEN_COOKIE_NAME)?.value ||
    cookieStore.get('access_token')?.value || ''
  ).trim()
}

const getMemberProfileForRequest = cache((slug: string, viewerToken: string) => (
  getMemberProfile(slug, viewerToken || undefined)
))

export async function generateMetadata({ params }: MemberProfilePageProps): Promise<Metadata> {
  const slug = await resolveSlug(params)
  if (!slug) return {}
  try {
    const viewerToken = await readViewerToken()
    const response = await getMemberProfileForRequest(slug, viewerToken)
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

  const viewerToken = await readViewerToken()

  let profile: PublicMemberProfileData | null = null
  let viewer: PublicMemberViewer | null = null
  let isHidden = false
  let message: string | null = null

  try {
    const response = await getMemberProfileForRequest(slug, viewerToken)
    if ('visible' in response && !response.visible) isHidden = true
    else if ('data' in response) {
      profile = response.data
      viewer = response.viewer ?? { is_owner: false, is_private_preview: false }
    }
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
  if (!profile || !viewer) return renderNotice(message || 'Profil konnte nicht geladen werden.')

  return <MemberProfileContent profile={profile} storedSlug={slug} viewer={viewer} />
}
