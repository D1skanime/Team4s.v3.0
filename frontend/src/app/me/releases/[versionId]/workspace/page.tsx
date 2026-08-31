'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { AdjacentNavigation, Badge, Button, Card, ErrorState, LoadingState, PageHeader, Tabs } from '@/components/ui'
import type { TabItem } from '@/components/ui'
import {
  ApiError,
  getAnimeFansubProjectTimeline,
  getEpisodeVersionEditorContext,
  getMyProjectDetail,
  getOwnProfile,
  getReleaseVersionCapabilities,
  updateEpisodeVersion,
} from '@/lib/api'
import { useAuthSession } from '@/lib/useAuthSession'
import type { MeProjectReleaseVersion } from '@/types/contributions'
import type { EpisodeVersionEditorContext } from '@/types/episodeVersion'
import type { AnimeFansubProjectTimeline } from '@/types/fansubNotes'
import type { ReleaseVersionCapabilities } from '@/types/releaseVersionMedia'
import { ReleaseVersionMediaSection } from '@/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection'
import { ReleaseVersionNotesTab } from '@/app/admin/episode-versions/[versionId]/edit/ReleaseVersionNotesTab'
import { SegmenteTab } from '@/app/admin/episode-versions/[versionId]/edit/SegmenteTab'
import { ReleaseVersionMetadataFields } from '@/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMetadataFields'
import {
  buildInitialFormState,
  fromDateInputValue,
  normalizeCRC32Draft,
  normalizeOptional,
  parseDurationInput,
  type FormState,
} from '@/app/admin/episode-versions/[versionId]/edit/episodeVersionEditorUtils'

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

function formatEpisodeLabel(value?: number | null, title?: string | null): string {
  return title?.trim() || formatEpisodeNumber(value)
}

function getProjectReturnPath(raw: string | null, animeId: number, fansubGroupId?: number | null): string | null {
  if (!raw || !fansubGroupId) return null
  const expected = `/me/projects/${animeId}/group/${fansubGroupId}`
  return raw === expected ? raw : null
}

function formatAdjacentReleaseLabel(release: MeProjectReleaseVersion): string {
  return release.episode_title?.trim() || release.title?.trim() || `Episode ${release.episode_number}`
}

function parseWorkspaceTab(value: string | null): WorkspaceTab | null {
  return value === 'metadata' || value === 'media' || value === 'segments' || value === 'notes'
    ? value
    : null
}

function buildWorkspaceHref(releaseVersionId: number, projectReturnHref: string | null): string {
  const path = `/me/releases/${releaseVersionId}/workspace`
  if (!projectReturnHref) return path
  const query = new URLSearchParams({ return_to: projectReturnHref })
  return `${path}?${query.toString()}`
}

type WorkspaceTab = 'metadata' | 'media' | 'segments' | 'notes'

type AdjacentReleases = { previous: MeProjectReleaseVersion | null; next: MeProjectReleaseVersion | null }

type NavigationState = {
  key: string
  status: 'ready' | 'error'
  adjacent: AdjacentReleases | null
}

export function MeReleaseWorkspacePage() {
  const params = useParams<{ versionId: string }>()
  const searchParams = useSearchParams()
  const versionId = parsePositiveInt(params.versionId)
  const { hasAccessToken, hasRefreshToken, isClientInitialized } = useAuthSession()
  const hasAuthSession = hasAccessToken || hasRefreshToken
  const requestedTab = searchParams.get('tab')
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
  const [navigationState, setNavigationState] = useState<NavigationState | null>(null)
  const [metadataForm, setMetadataForm] = useState<FormState | null>(null)
  const [projectTimeline, setProjectTimeline] = useState<AnimeFansubProjectTimeline | null>(null)
  const [metadataError, setMetadataError] = useState<string | null>(null)
  const [metadataSuccess, setMetadataSuccess] = useState<string | null>(null)
  const [isSavingMetadata, setIsSavingMetadata] = useState(false)
  const [activeTab, setActiveTab] = useState<WorkspaceTab | null>(() => parseWorkspaceTab(requestedTab))

  useEffect(() => {
    setActiveTab(parseWorkspaceTab(requestedTab))
  }, [requestedTab])

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
        setMetadataForm(buildInitialFormState(contextResponse.data))
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

  useEffect(() => {
    const selectedGroupId = context?.selected_groups[0]?.id
    const animeId = context?.version.anime_id
    if (!selectedGroupId || !animeId) {
      setProjectTimeline(null)
      return
    }

    let cancelled = false
    void getAnimeFansubProjectTimeline(selectedGroupId, animeId)
      .then((timeline) => {
        if (!cancelled) setProjectTimeline(timeline)
      })
      .catch(() => {
        if (!cancelled) setProjectTimeline(null)
      })

    return () => {
      cancelled = true
    }
  }, [context?.selected_groups, context?.version.anime_id])

  async function saveMetadata(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!versionId || !metadataForm) return

    const durationSeconds = parseDurationInput(metadataForm.durationSeconds)
    if (metadataForm.durationSeconds.trim() && durationSeconds == null) {
      setMetadataError('Gesamtdauer ist ungültig. Erlaubt sind Sekunden, m:ss, hh:mm:ss sowie Kurzformen wie 2m oder 1m30s.')
      setMetadataSuccess(null)
      return
    }

    setIsSavingMetadata(true)
    setMetadataError(null)
    setMetadataSuccess(null)
    try {
      const response = await updateEpisodeVersion(versionId, {
        title: normalizeOptional(metadataForm.title),
        video_quality: normalizeOptional(metadataForm.videoQuality),
        subtitle_type: metadataForm.subtitleType || null,
        production_started_on: fromDateInputValue(metadataForm.productionStartedOn),
        release_date: fromDateInputValue(metadataForm.releaseDate),
        crc32: normalizeOptional(normalizeCRC32Draft(metadataForm.crc32)),
        duration_seconds: durationSeconds,
      })
      setContext((current) => current ? { ...current, version: response.data } : current)
      setMetadataSuccess('Basisdaten gespeichert.')
    } catch (error) {
      setMetadataError(readErrorMessage(error, 'Basisdaten konnten nicht gespeichert werden.'))
    } finally {
      setIsSavingMetadata(false)
    }
  }

  useEffect(() => {
    const selectedGroupId = context?.selected_groups[0]?.id
    const animeId = context?.version.anime_id
    const currentReleaseVersionId = context?.version.id
    if (!animeId || !selectedGroupId || !currentReleaseVersionId) return

    let cancelled = false
    const key = `${animeId}:${selectedGroupId}:${currentReleaseVersionId}`

    void getMyProjectDetail(animeId, selectedGroupId)
      .then((response) => {
        if (cancelled) return
        const project = response.data
        if (project.anime_id !== animeId || project.fansub_group_id !== selectedGroupId) {
          setNavigationState({ key, status: 'ready', adjacent: null })
          return
        }
        const currentIndex = project.release_versions.findIndex(
          (release) => release.release_version_id === currentReleaseVersionId,
        )
        if (currentIndex < 0) {
          setNavigationState({ key, status: 'ready', adjacent: null })
          return
        }
        setNavigationState({
          key,
          status: 'ready',
          adjacent: {
            previous: project.release_versions[currentIndex - 1] ?? null,
            next: project.release_versions[currentIndex + 1] ?? null,
          },
        })
      })
      .catch(() => {
        if (!cancelled) setNavigationState({ key, status: 'error', adjacent: null })
      })

    return () => {
      cancelled = true
    }
  }, [context])

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
  const selectedGroup = context.selected_groups[0]
  const groupName = selectedGroup?.name ?? 'Fansubgruppe'
  const projectReturnHref = getProjectReturnPath(searchParams.get('return_to'), version.anime_id, selectedGroup?.id)
  const releaseVersionLabel = version.release_version?.trim() || `Version #${version.id}`
  const episodeLabel = formatEpisodeLabel(version.episode_number, version.title)
  const episodeNumberLabel = formatEpisodeNumber(version.episode_number)
  const canUseMedia = capabilities.can_view_media
  const canUseNotes = capabilities.can_edit_notes && memberId != null
  const canUseSegments = capabilities.can_manage_segments
  const canEditMetadata = capabilities.can_edit_metadata === true
  const hasAnyWorkspaceAccess = canUseMedia || capabilities.can_edit_notes || canUseSegments || canEditMetadata
  const navigationKey = selectedGroup?.id ? `${version.anime_id}:${selectedGroup.id}:${version.id}` : null
  const isNavigationLoading = navigationKey != null && navigationState?.key !== navigationKey
  const navigationError = navigationState?.key === navigationKey && navigationState.status === 'error'
  const adjacentReleases =
    navigationState?.key === navigationKey && navigationState.status === 'ready' ? navigationState.adjacent : null
  const tabItems: TabItem[] = []

  if (canEditMetadata && metadataForm) {
    tabItems.push({
      id: 'metadata',
      label: 'Basisdaten',
      content: (
        <Card title="Basisdaten">
          <p className={styles.metadataDescription}>Release-Metadaten für diese Version.</p>
          <form className={styles.metadataForm} onSubmit={(event) => void saveMetadata(event)}>
            <ReleaseVersionMetadataFields
              context={context}
              formState={metadataForm}
              setFormState={(next) =>
                setMetadataForm((current) => {
                  if (current == null) return current
                  return typeof next === 'function' ? next(current) : next
                })
              }
              projectTimeline={projectTimeline}
            />
            {metadataError ? <p className={styles.metadataError} role="alert">{metadataError}</p> : null}
            {metadataSuccess ? <p className={styles.metadataSuccess} role="status">{metadataSuccess}</p> : null}
            <Button type="submit" variant="success" loading={isSavingMetadata}>
              Basisdaten speichern
            </Button>
          </form>
        </Card>
      ),
    })
  }

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

  if (canUseSegments) {
    tabItems.push({
      id: 'segments',
      label: 'Segmente',
      content: (
        <Card>
          <SegmenteTab
            animeId={version.anime_id}
            groupId={selectedGroup?.id ?? null}
            version={version.release_version ?? null}
            episodeNumber={version.episode_number}
            durationSeconds={version.duration_seconds}
            releaseVariantId={version.id}
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
              {projectReturnHref ? <Link href={projectReturnHref}>{context.anime_title}</Link> : <span>{context.anime_title}</span>}
              <span>/</span>
              <span>{episodeNumberLabel}</span>
            </nav>
          }
          eyebrow="Release-Projektbereich"
          title={context.anime_title}
          description={`${episodeLabel} · ${groupName} · ${releaseVersionLabel}`}
          actions={
            <div className={styles.headerActions}>
              {projectReturnHref ? (
                <Button
                  href={projectReturnHref}
                  variant="secondary"
                  size="sm"
                  leftIcon={<ArrowLeft size={15} aria-hidden="true" />}
                >
                  Zurück zum Projekt
                </Button>
              ) : null}
              <div className={styles.badgeRow}>
                {capabilities.can_upload_media ? <Badge variant="info">Medien hochladen</Badge> : null}
                {capabilities.can_edit_notes ? <Badge variant="success">Notizen</Badge> : null}
              </div>
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
            {isNavigationLoading ? (
              <p className={styles.navigationStatus} role="status">Release-Navigation wird geladen.</p>
            ) : navigationError ? (
              <p className={styles.navigationStatus} role="status">Release-Navigation konnte nicht geladen werden.</p>
            ) : adjacentReleases ? (
              <AdjacentNavigation
                className={styles.releaseNavigation}
                ariaLabel="Vorheriger und nächster Release"
                previous={adjacentReleases.previous ? {
                  href: buildWorkspaceHref(adjacentReleases.previous.release_version_id, projectReturnHref),
                  label: formatAdjacentReleaseLabel(adjacentReleases.previous),
                  ariaLabel: `Vorheriger Release: ${formatAdjacentReleaseLabel(adjacentReleases.previous)}`,
                } : null}
                next={adjacentReleases.next ? {
                  href: buildWorkspaceHref(adjacentReleases.next.release_version_id, projectReturnHref),
                  label: formatAdjacentReleaseLabel(adjacentReleases.next),
                  ariaLabel: `Nächster Release: ${formatAdjacentReleaseLabel(adjacentReleases.next)}`,
                } : null}
              />
            ) : null}

            <Tabs
              items={tabItems}
              defaultTabId={canEditMetadata ? 'metadata' : canUseMedia ? 'media' : canUseSegments ? 'segments' : 'notes'}
              activeId={tabItems.some((item) => item.id === activeTab) ? activeTab ?? undefined : undefined}
              onActiveIdChange={(tab) => setActiveTab(tab as WorkspaceTab)}
            />

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
