import { cache } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { ErrorState } from '@/components/ui/ErrorState'
import { ApiError, getMemberProfile } from '@/lib/api'

import { MemberProfileContent } from './MemberProfileContent'
import styles from './page.module.css'

const STORED_MEMBER_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const NEUTRAL_UNAVAILABLE_METADATA: Metadata = {
  title: 'Profil nicht verfügbar | Team4s',
  robots: { index: false, follow: false },
}

interface MemberProfilePageProps {
  params: Promise<{ slug: string }>
}

async function resolveSlug(params: MemberProfilePageProps['params']): Promise<string> {
  const resolvedParams = await params
  return resolvedParams.slug || ''
}

function isCanonicalStoredSlug(slug: string): boolean {
  return (
    slug.length > 0
    && slug.length <= 512
    && !/^\d+$/.test(slug)
    && STORED_MEMBER_SLUG.test(slug)
  )
}

function isNotFoundError(error: unknown): boolean {
  if (error instanceof ApiError) return error.status === 404
  return (
    typeof error === 'object'
    && error !== null
    && 'status' in error
    && (error as { status?: unknown }).status === 404
  )
}

const getMemberProfileForRequest = cache((slug: string) => getMemberProfile(slug))

export async function generateMetadata({ params }: MemberProfilePageProps): Promise<Metadata> {
  const slug = await resolveSlug(params)
  if (!isCanonicalStoredSlug(slug)) return NEUTRAL_UNAVAILABLE_METADATA

  try {
    const response = await getMemberProfileForRequest(slug)
    if (response.data.noindex) {
      return { robots: { index: false, follow: false } }
    }
  } catch (error) {
    if (isNotFoundError(error)) return NEUTRAL_UNAVAILABLE_METADATA
  }

  return {}
}

function renderLoadError() {
  return (
    <main className={styles.page}>
      <div className={styles.stateRegion}>
        <ErrorState
          title="Profil konnte nicht geladen werden"
          description="Bitte versuche es später erneut."
        />
      </div>
    </main>
  )
}

export default async function MemberProfilePage({ params }: MemberProfilePageProps) {
  const slug = await resolveSlug(params)
  if (!isCanonicalStoredSlug(slug)) notFound()

  let response: Awaited<ReturnType<typeof getMemberProfileForRequest>>

  try {
    response = await getMemberProfileForRequest(slug)
  } catch (error) {
    if (isNotFoundError(error)) notFound()
    return renderLoadError()
  }

  return (
    <MemberProfileContent
      profile={response.data}
      storedSlug={slug}
      viewer={response.viewer}
    />
  )
}
