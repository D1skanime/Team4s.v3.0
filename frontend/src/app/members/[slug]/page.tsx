import { cache } from 'react'
import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'

import { ErrorState } from '@/components/ui/ErrorState'
import { ApiError, getMemberProfile } from '@/lib/api'
import { canonicalMemberSlug } from '@/lib/memberCanonicalSlug'

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

// composeVisibleProfileMetadata baut Titel/Beschreibung/OG-Tags NUR aus bereits
// oeffentlich freigegebenen Feldern (fansub_name, known_for) des schon als sichtbar
// bestaetigten Profils (T-132-07) -- keine eigene, parallele Sichtbarkeitsentscheidung.
function composeVisibleProfileMetadata(profile: { fansub_name: string; known_for: { active_years: string; top_roles: string[]; known_groups: string[] } }): Metadata {
  const title = `${profile.fansub_name} | Team4s`

  const facts: string[] = []
  if (profile.known_for.top_roles.length > 0) {
    facts.push(`Schwerpunkte: ${profile.known_for.top_roles.join(', ')}`)
  }
  if (profile.known_for.known_groups.length > 0) {
    facts.push(`Bekannt bei: ${profile.known_for.known_groups.join(', ')}`)
  }
  if (profile.known_for.active_years) {
    facts.push(`Aktiv: ${profile.known_for.active_years}`)
  }

  const description = facts.length > 0
    ? facts.join(' · ')
    : `${profile.fansub_name} bei Team4s.`

  return {
    title,
    description,
    openGraph: { title, description },
  }
}

export async function generateMetadata({ params }: MemberProfilePageProps): Promise<Metadata> {
  const slug = await resolveSlug(params)
  if (!isCanonicalStoredSlug(slug)) return NEUTRAL_UNAVAILABLE_METADATA

  try {
    const response = await getMemberProfileForRequest(slug)
    if (response.data.noindex) {
      return { robots: { index: false, follow: false } }
    }
    return composeVisibleProfileMetadata(response.data)
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

  // Canonical-Redirect auf Route-Ebene: syntax-only und vor jedem DB-Zugriff.
  // Nicht-kanonische, aber sichere Slugs (z. B. abweichende Gross-/Kleinschreibung)
  // werden dauerhaft (308) auf die gespeicherte Form umgeleitet - unabhaengig von
  // Existenz, Sichtbarkeit oder Auth. Numerische/unsichere Slugs liefern null und
  // fallen unveraendert auf die neutrale notFound-Ausgabe zurueck.
  const canonicalSlug = canonicalMemberSlug(slug)
  if (canonicalSlug && canonicalSlug !== slug) {
    permanentRedirect(`/members/${canonicalSlug}`)
  }

  if (!isCanonicalStoredSlug(slug)) notFound()

  let response: Awaited<ReturnType<typeof getMemberProfileForRequest>>

  try {
    response = await getMemberProfileForRequest(slug)
  } catch (error) {
    if (isNotFoundError(error)) notFound()
    return renderLoadError()
  }

  // Ein serverseitig einmalig erfasster Referenzzeitpunkt (PMFE-09): wird unveraendert an
  // MemberProfileContent -> LatestContributionsSection durchgereicht, damit relative
  // Zeitangaben ("vor 3 Tagen") zwischen SSR-Markup und Hydration identisch bleiben, statt bei
  // jedem Render neu Date.now() zu lesen.
  const referenceNow = Date.now()

  return (
    <MemberProfileContent
      profile={response.data}
      storedSlug={slug}
      viewer={response.viewer}
      referenceNow={referenceNow}
    />
  )
}
