'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

import { Badge, Button, Card, ErrorState, LoadingState, PageHeader, Tabs } from '@/components/ui'
import type { TabItem } from '@/components/ui'
import {
  ApiError,
  getEpisodeVersionEditorContext,
  getOwnProfile,
  getReleaseVersionCapabilities,
} from '@/lib/api'
import { useAuthSession } from '@/lib/useAuthSession'
import type { EpisodeVersionEditorContext } from '@/types/episodeVersion'
import type { ReleaseVersionCapabilities } from '@/types/releaseVersionMedia'
import { ReleaseVersionMediaSection } from '@/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection'
import { ReleaseVersionNotesTab } from '@/app/admin/episode-versions/[versionId]/edit/ReleaseVersionNotesTab'

import styles from './workspace.module.css'

function parsePositiveInt(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value
  if (!raw) return null
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function readErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return fallback
}

function formatEpisodeNumber(value?: number | null): string {
  if (value == null) return 'Episode'
  return `Episode ${String(value).padStart(2, '0')}`
}

export function MeReleaseWorkspacePage() {
  const params = useParams<{ versionId: string }>()
  const versionId = parsePositiveInt(params.versionId)
  const { hasAccessToken, hasRefreshToken, isClientInitialized } = useAuthSession()
  const hasAuthSession = hasAccessToken || hasRefreshToken
  const routeErrorMessage = !versionId
    ? 'Ungültige Release-Version.'
    : !hasAuthSession
      ? 'Bitte einloggen, um deinen Projektbereich zu öffnen.'
      : null

  const [context, setContext] = useState<EpisodeVersionEditorContext | null>(null)
  const [capabilities, setCapabilities] = useState<ReleaseVersionCapabilities | null>(null)
  const [memberId, setMemberId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!isClientInitialized) return
    if (!versionId || routeErrorMessage) return

    let cancelled = false

    void Promise.all([
      getEpisodeVersionEditorContext(versionId),
      getReleaseVersionCapabilities(versionId),
      getOwnProfile(),
    ])
      .then(([contextResponse, capabilitiesResponse, profileResponse]) => {
        if (cancelled) return
        const nextCapabilities = capabilitiesResponse.data
        setContext(contextResponse.data)
        setCapabilities(nextCapabilities)
        setMemberId(profileResponse.data.member_id > 0 ? profileResponse.data.member_id : null)
      })
      .catch((error) => {
        if (!cancelled) {
          setErrorMessage(readErrorMessage(error, 'Projektbereich konnte nicht geladen werden.'))
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [isClientInitialized, routeErrorMessage, versionId])

  if (!isClientInitialized) {
    return <LoadingState title="Projektbereich wird geladen" description="Team4s lädt deine Release-Version." />
  }

  if (routeErrorMessage) {
    return (
      <main className={styles.page}>
        <ErrorState
          title="Projektbereich nicht verfügbar"
          description={routeErrorMessage}
          action={<Button href="/me/contributions" variant="secondary">Meine Projekte</Button>}
        />
      </main>
    )
  }

  if (isLoading) {
    return <LoadingState title="Projektbereich wird geladen" description="Team4s lädt deine Release-Version." />
  }

  if (errorMessage || !context || !capabilities || !versionId) {
    return (
      <main className={styles.page}>
        <ErrorState
          title="Projektbereich nicht verfügbar"
          description={errorMessage ?? 'Diese Release-Version konnte nicht geladen werden.'}
          action={<Button href="/me/contributions" variant="secondary">Meine Projekte</Button>}
        />
      </main>
    )
  }

  const version = context.version
  const groupName = context.selected_groups[0]?.name ?? 'Fansubgruppe'
  const releaseVersionLabel = version.release_version?.trim() || `Version #${version.id}`
  const episodeLabel = formatEpisodeNumber(version.episode_number)
  const canUseMedia = capabilities.can_view_media
  const canUseNotes = capabilities.can_edit_notes && memberId != null
  const hasAnyWorkspaceAccess = canUseMedia || capabilities.can_edit_notes
  const tabItems: TabItem[] = []

  if (canUseMedia) {
    tabItems.push({
      id: 'media',
      label: 'Bilder & Medien',
      content: (
        <Card>
          <ReleaseVersionMediaSection
            versionId={version.id}
            fansubGroupName={groupName}
            releaseVersionLabel={releaseVersionLabel}
          />
        </Card>
      ),
    })
  }

  if (canUseNotes) {
    tabItems.push({
      id: 'notes',
      label: 'Notizen',
      content: (
        <Card>
          <ReleaseVersionNotesTab versionId={version.id} memberIdFilter={memberId} />
        </Card>
      ),
    })
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <PageHeader
          breadcrumbs={
            <nav className={styles.breadcrumb} aria-label="Breadcrumb">
              <Link href="/me/contributions">Meine Projekte</Link>
              <span>/</span>
              <span>{context.anime_title}</span>
              <span>/</span>
              <span>{episodeLabel}</span>
            </nav>
          }
          eyebrow="Release-Projektbereich"
          title={context.anime_title}
          description={`${episodeLabel} · ${groupName} · ${releaseVersionLabel}`}
          actions={
            <div className={styles.badgeRow}>
              {capabilities.can_upload_media ? <Badge variant="info">Medien hochladen</Badge> : null}
              {capabilities.can_edit_notes ? <Badge variant="success">Notizen</Badge> : null}
            </div>
          }
        />

        {!hasAnyWorkspaceAccess ? (
          <ErrorState
            title="Kein Zugriff auf diesen Projektbereich"
            description="Du bist für diese Release-Version nicht als Mitwirkender freigeschaltet."
            action={<Button href="/me/contributions" variant="secondary">Meine Projekte</Button>}
          />
        ) : (
          <>
            <Tabs items={tabItems} defaultTabId={canUseMedia ? 'media' : 'notes'} />

            {capabilities.can_edit_notes && memberId == null ? (
              <ErrorState
                title="Member-Profil fehlt"
                description="Notizen sind erst verfügbar, wenn dein App-Profil mit einem Member-Profil verknüpft ist."
              />
            ) : null}
          </>
        )}
      </div>
    </main>
  )
}

export default function Page() {
  return <MeReleaseWorkspacePage />
}
