'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { AdjacentNavigation, Badge, Button, Card, ErrorState, LoadingState, PageHeader, Tabs } from '@/components/ui'
import type { TabItem } from '@/components/ui'
import { getAnimeFansubProjectTimeline, getCurrentUser, getOwnProfile, getReleaseVersionCapabilities } from '@/lib/api'
import { buildFansubReleaseHref } from '@/lib/fansubProjectRoutes'
import type { CurrentUserData } from '@/types/auth'
import type { AnimeFansubProjectTimeline } from '@/types/fansubNotes'
import type { ReleaseVersionCapabilities } from '@/types/releaseVersionMedia'

import { ReleaseVersionMediaSection } from '@/components/releaseEditor/ReleaseVersionMediaSection'
import { ReleaseVersionNotesTab } from '@/components/releaseEditor/ReleaseVersionNotesTab'
import { SegmenteTab } from '@/components/releaseEditor/SegmenteTab'

import { ReleaseEditorChangelogTab } from './ReleaseEditorChangelogTab'
import { ReleaseEditorFilesTab } from './ReleaseEditorFilesTab'
import { ReleaseEditorMetadataTab } from './ReleaseEditorMetadataTab'
import {
  RELEASE_EDITOR_TAB_IDS,
  buildReleaseEditorTabIds,
  type ReleaseEditorTabId,
} from './releaseEditorTabs'
import {
  formatEpisodeLabel,
  formatEpisodeNumber,
  getProjectReturnPath,
  getSafeReturnPath,
  parsePositiveInt,
  resolveNavigationContext,
} from './releaseEditorRouting'
import { useReleaseEditorData } from './useReleaseEditorData'
import { useReleaseEditorNavigation } from './useReleaseEditorNavigation'

import styles from './ReleaseEditorPage.module.css'

/**
 * D-01/D-02/D-03/D-05: die eine, rechtebasierte Release-Bearbeitungsseite unter
 * `/releases/[versionId]/edit`, zusammengesetzt aus Plan 02 (Routing/Tab-Utilities), Plan 04
 * (relozierte geteilte Tab-Inhalte), Plan 05 (Navigations-/Daten-Hooks) und Plan 06 (Metadata/
 * Dateien/Changelog-Tab-Inhalte). Ersetzt perspektivisch `EpisodeVersionEditorPage.tsx` und die
 * Workspace-`page.tsx` (Plan 09 loescht beide Altseiten nach Umstellung aller Einstiegspunkte).
 */
export function ReleaseEditorPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const editor = useReleaseEditorData()

  const scopeGeneration = useRef(0)
  const [currentUser, setCurrentUser] = useState<CurrentUserData | null>(null)
  const [capabilities, setCapabilities] = useState<ReleaseVersionCapabilities | null>(null)
  const [memberId, setMemberId] = useState<number | null>(null)
  const [scopeError, setScopeError] = useState<string | null>(null)
  const [timelineState, setTimelineState] = useState<{ key: string; data: AnimeFansubProjectTimeline | null } | null>(null)

  const contextVersionId = editor.contextData?.version.id ?? null

  // Own generation-guarded Promise.all for admin/contributor scope data, mirroring
  // workspace/page.tsx:64,86-122 -- independent of useReleaseEditorData's internal race guard,
  // which only covers the editor-context/form load itself. No synchronous setState call sits in
  // the effect body itself (react-hooks/set-state-in-effect) -- every setter runs inside the
  // async .then()/.catch() callback, matching the key-tracking pattern already established by
  // useEpisodeNeighborNavigation/useProjectNeighborNavigation in this same folder (Plan 05).
  useEffect(() => {
    if (!contextVersionId) return

    let cancelled = false
    scopeGeneration.current += 1

    void Promise.all([getCurrentUser(), getOwnProfile(), getReleaseVersionCapabilities(contextVersionId)])
      .then(([userResponse, profileResponse, capabilitiesResponse]) => {
        if (cancelled) return
        setCurrentUser(userResponse.data)
        setCapabilities(capabilitiesResponse.data)
        setMemberId(profileResponse.data.member_id > 0 ? profileResponse.data.member_id : null)
        setScopeError(null)
      })
      .catch(() => {
        if (!cancelled) {
          setScopeError('Berechtigungen für diese Release-Version konnten nicht geladen werden.')
        }
      })

    return () => {
      cancelled = true
      scopeGeneration.current += 1
    }
  }, [contextVersionId])

  const timelineGroupId = editor.selectedGroups[0]?.id ?? null
  const timelineAnimeId = editor.contextData?.version.anime_id ?? null
  const timelineKey = timelineGroupId != null && timelineAnimeId != null ? `${timelineGroupId}:${timelineAnimeId}` : null

  useEffect(() => {
    if (!timelineKey || timelineGroupId == null || timelineAnimeId == null) return

    let cancelled = false
    void getAnimeFansubProjectTimeline(timelineGroupId, timelineAnimeId)
      .then((timeline) => {
        if (!cancelled) setTimelineState({ key: timelineKey, data: timeline })
      })
      .catch(() => {
        if (!cancelled) setTimelineState({ key: timelineKey, data: null })
      })

    return () => {
      cancelled = true
    }
  }, [timelineKey, timelineGroupId, timelineAnimeId])

  const projectTimeline = timelineKey && timelineState?.key === timelineKey ? timelineState.data : null

  const requestedTab = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState<ReleaseEditorTabId | null>(() =>
    (RELEASE_EDITOR_TAB_IDS as readonly string[]).includes(requestedTab ?? '') ? (requestedTab as ReleaseEditorTabId) : null,
  )

  const selectedGroups = editor.selectedGroups
  const primaryGroup = selectedGroups[0] ?? null
  const groupName = selectedGroups.length > 0 ? selectedGroups.map((group) => group.name).join(' & ') : null
  const animeId = editor.contextData?.version.anime_id ?? null
  const episodeVersion = editor.contextData?.version.release_version?.trim() || 'v1'

  const isPlatformAdmin = currentUser?.is_platform_admin === true
  const canEditMetadata = capabilities?.can_edit_metadata === true
  const canManageSegments = capabilities?.can_manage_segments === true
  const canUseMedia = capabilities?.can_view_media === true
  const canUseNotes = capabilities != null && capabilities.can_edit_notes && memberId != null
  const isScopeReady = currentUser != null && capabilities != null

  const tabIds: ReleaseEditorTabId[] = isScopeReady
    ? buildReleaseEditorTabIds({ isPlatformAdmin, canEditMetadata, canManageSegments, canUseMedia, canUseNotes })
    : []
  const effectiveActiveTab: ReleaseEditorTabId | undefined =
    activeTab != null && tabIds.includes(activeTab) ? activeTab : tabIds[0]

  const returnToQuery = searchParams.get('return_to')
  const animeIdQuery = parsePositiveInt(searchParams.get('animeId') ?? undefined)
  const episodeIdQuery = parsePositiveInt(searchParams.get('episodeId') ?? undefined)
  const safeReturnTo = getSafeReturnPath(returnToQuery)
  const navigationContext = resolveNavigationContext({ returnTo: safeReturnTo, animeIdQuery, episodeIdQuery })
  const isEpisodeContext = navigationContext === 'episode'

  const projectReturnHref = animeId != null ? getProjectReturnPath(returnToQuery, animeId, primaryGroup?.id) : null

  const nav = useReleaseEditorNavigation(navigationContext, {
    animeId,
    selectedGroupId: primaryGroup?.id ?? null,
    currentReleaseVersionId: editor.contextData?.version.id ?? null,
    episodeVersion,
    activeTab: effectiveActiveTab ?? RELEASE_EDITOR_TAB_IDS[0],
    projectReturnHref,
  })

  function handleTabChange(id: string) {
    setActiveTab(id as ReleaseEditorTabId)
    const nextParams = new URLSearchParams(searchParams.toString())
    nextParams.set('tab', id)
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false })
  }

  const fansubGroupHref = primaryGroup != null ? `/admin/fansubs/${primaryGroup.id}/edit` : null
  const publicReleaseHref =
    animeId != null && primaryGroup?.id != null && editor.contextData?.version.id != null
      ? buildFansubReleaseHref({ animeID: animeId, groupID: primaryGroup.id, releaseVersionID: editor.contextData.version.id })
      : null

  const backHref = isEpisodeContext
    ? (safeReturnTo ??
        (animeIdQuery != null && episodeIdQuery != null
          ? `/admin/anime/${animeIdQuery}/episodes/${episodeIdQuery}/versions`
          : fansubGroupHref != null
            ? `${fansubGroupHref}?tab=releases`
            : animeId != null
              ? `/admin/anime/${animeId}/edit`
              : '/admin/anime'))
    : projectReturnHref
  const showBackButton = isEpisodeContext || projectReturnHref != null

  // --- Loading / error states (all hooks above already ran, safe to return early here) ---

  if (editor.isLoading) {
    return <LoadingState title="Release-Version wird geladen" description="Team4s lädt deine Release-Version." />
  }

  if (editor.errorMessage || !editor.contextData) {
    return (
      <main className={styles.page}>
        <ErrorState
          title="Release-Version nicht verfügbar"
          description={editor.errorMessage ?? 'Diese Release-Version konnte nicht geladen werden.'}
          action={
            <Button href={isPlatformAdmin ? '/admin/anime' : '/me/contributions'} variant="secondary">
              {isPlatformAdmin ? 'Zur Anime-Verwaltung' : 'Meine Projekte'}
            </Button>
          }
        />
      </main>
    )
  }

  if (currentUser == null || capabilities == null) {
    if (scopeError) {
      return (
        <main className={styles.page}>
          <ErrorState
            title="Release-Version nicht verfügbar"
            description={scopeError}
            action={<Button href="/me/contributions" variant="secondary">Meine Projekte</Button>}
          />
        </main>
      )
    }
    return <LoadingState title="Release-Version wird geladen" description="Team4s lädt deine Release-Version." />
  }

  if (!isPlatformAdmin && tabIds.length === 0) {
    return (
      <main className={styles.page}>
        <ErrorState
          title="Kein Zugriff auf diesen Projektbereich"
          description="Du bist für diese Release-Version nicht als Mitwirkender freigeschaltet."
          action={<Button href="/me/contributions" variant="secondary">Meine Projekte</Button>}
        />
      </main>
    )
  }

  const version = editor.contextData.version
  const episodeNumberLabel = formatEpisodeNumber(version.episode_number)
  const episodeLabel = formatEpisodeLabel(version.episode_number, version.title)
  const releaseVersionLabel = version.release_version?.trim() || `Version #${version.id}`
  const animeTitle = editor.contextData.anime_title
  const animeTitleHref = isEpisodeContext ? (animeId != null ? `/admin/anime/${animeId}/edit` : null) : projectReturnHref

  const tabItems: TabItem[] = []
  if (tabIds.includes('metadata')) {
    tabItems.push({
      id: 'metadata',
      label: 'Basisdaten',
      content: (
        <Card title="Basisdaten">
          <ReleaseEditorMetadataTab
            editor={editor}
            isPlatformAdmin={isPlatformAdmin}
            canEditMetadata={canEditMetadata}
            projectTimeline={projectTimeline}
          />
        </Card>
      ),
    })
  }
  if (tabIds.includes('files')) {
    tabItems.push({ id: 'files', label: 'Dateien', content: <Card title="Dateien"><ReleaseEditorFilesTab editor={editor} /></Card> })
  }
  if (tabIds.includes('segments')) {
    tabItems.push({
      id: 'segments',
      label: 'Segmente',
      content: (
        <Card>
          <SegmenteTab
            animeId={animeId}
            groupId={primaryGroup?.id ?? null}
            version={version.release_version ?? null}
            episodeNumber={version.episode_number}
            chapterHints={editor.chapterHints}
            durationSeconds={version.duration_seconds}
            releaseVariantId={version.id}
          />
        </Card>
      ),
    })
  }
  if (tabIds.includes('media')) {
    tabItems.push({
      id: 'media',
      label: 'Bilder & Medien',
      content: (
        <Card>
          <ReleaseVersionMediaSection
            versionId={version.id}
            contextTitle={`${episodeLabel}${groupName ? ` · ${groupName}` : ''} · ${releaseVersionLabel}`}
            storyContext={{ animeId, groupId: primaryGroup?.id ?? null, version: episodeVersion }}
          />
        </Card>
      ),
    })
  }
  if (tabIds.includes('changelog')) {
    tabItems.push({ id: 'changelog', label: 'Änderungsverlauf', content: <ReleaseEditorChangelogTab /> })
  }
  if (tabIds.includes('notes')) {
    tabItems.push({
      id: 'notes',
      label: 'Notizen',
      content: (
        <Card>
          <ReleaseVersionNotesTab versionId={version.id} memberIdFilter={isPlatformAdmin ? null : memberId} />
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
              {isEpisodeContext ? <Link href="/admin/anime">Anime</Link> : <Link href="/me/contributions">Meine Projekte</Link>}
              <span>/</span>
              {animeTitleHref ? <Link href={animeTitleHref}>{animeTitle}</Link> : <span>{animeTitle}</span>}
              <span>/</span>
              <span>{episodeNumberLabel}</span>
            </nav>
          }
          eyebrow={isPlatformAdmin ? 'Administrator' : 'Release-Projektbereich'}
          title={animeTitle}
          description={`${episodeLabel} · ${groupName ?? 'Fansubgruppe'} · ${releaseVersionLabel}`}
          actions={
            <div className={styles.headerActions}>
              {showBackButton && backHref ? (
                <Button href={backHref} variant="secondary" size="sm" leftIcon={<ArrowLeft size={15} aria-hidden="true" />}>
                  {isEpisodeContext ? 'Zurück' : 'Zurück zum Projekt'}
                </Button>
              ) : null}
              {isPlatformAdmin && fansubGroupHref != null && selectedGroups.length === 1 ? (
                <Button href={fansubGroupHref} variant="secondary">Zur Fansubgruppe</Button>
              ) : null}
              {publicReleaseHref ? (
                <Button href={publicReleaseHref} variant="secondary" size="sm" target="_blank" rel="noopener noreferrer">
                  Öffentliche Release-Seite
                </Button>
              ) : null}
              {isPlatformAdmin ? (
                <Button variant="danger" onClick={() => void editor.handleDelete()} loading={editor.isDeleting}>
                  Version löschen
                </Button>
              ) : null}
              <div className={styles.badgeRow}>
                {isPlatformAdmin && editor.hasUnsavedChanges ? <Badge variant="warning">Ungespeicherte Änderungen</Badge> : null}
                {capabilities?.can_upload_media ? <Badge variant="info">Medien hochladen</Badge> : null}
                {capabilities?.can_edit_notes ? <Badge variant="success">Notizen</Badge> : null}
              </div>
            </div>
          }
        />

        {nav.isLoading ? (
          <p className={styles.navigationStatus} role="status">Release-Navigation wird geladen.</p>
        ) : nav.error ? (
          <p className={styles.navigationStatus} role="status">Release-Navigation konnte nicht geladen werden.</p>
        ) : (
          <AdjacentNavigation
            className={styles.releaseNavigation}
            ariaLabel="Vorheriger und nächster Release"
            centerLabel={nav.centerLabel}
            previous={nav.previousHref ? { href: nav.previousHref, label: nav.previousLabel! } : null}
            next={nav.nextHref ? { href: nav.nextHref, label: nav.nextLabel! } : null}
          />
        )}

        <Tabs
          items={tabItems}
          defaultTabId={tabIds[0]}
          activeId={effectiveActiveTab}
          onActiveIdChange={handleTabChange}
        />

        {capabilities.can_edit_notes && memberId == null ? (
          <ErrorState
            title="Member-Profil fehlt"
            description="Notizen sind erst verfügbar, wenn dein App-Profil mit einem Member-Profil verknüpft ist."
          />
        ) : null}
      </div>
      {editor.confirmDialog}
    </main>
  )
}
