'use client'

import Link from 'next/link'
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { ApiError, getRuntimeAuthToken } from '@/lib/api'
import { AnimeListItem } from '@/types/anime'

import { AnimeBrowser } from './components/AnimeBrowser/AnimeBrowser'
import { AnimeContextCard } from './components/AnimeContext/AnimeContextCard'
import { AnimeEditor } from './components/AnimePatchForm/AnimeEditor'
import { JellyfinSyncPanel } from './components/JellyfinSync/JellyfinSyncPanel'
import { EpisodeManager } from './components/EpisodeManager/EpisodeManager'
import { MessageToast } from './components/MessageToast'
import { ActiveContextPanel } from './components/StudioLayout/ActiveContextPanel'
import { AdminLayout } from './components/StudioLayout/AdminLayout'
import { AnimeBrowserPanel } from './components/StudioLayout/AnimeBrowserPanel'
import { EditorPanel } from './components/StudioLayout/EditorPanel'
import { useAdminMessages } from './hooks/useAdminMessages'
import { useAnimeBrowser } from './hooks/useAnimeBrowser'
import { useAnimeContext } from './hooks/useAnimeContext'
import { useJellyfinSync } from './hooks/useJellyfinSync'
import { parsePositiveInt } from './utils/anime-helpers'
import styles from '../admin.module.css'

function formatError(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    return `(${error.status}) ${error.message}`
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }
  return fallback
}

export default function AdminAnimePage() {
  const [authToken] = useState(() => getRuntimeAuthToken())
  const [contextAnimeIDInput, setContextAnimeIDInput] = useState('')
  const [editorMode, setEditorMode] = useState<'anime' | 'episode'>('anime')
  const [animeEditorState, setAnimeEditorState] = useState({ hasUnsavedChanges: false, isSaving: false })
  const [episodeEditorState, setEpisodeEditorState] = useState({
    selectedEpisodeId: null as number | null,
    hasUnsavedChanges: false,
    isSaving: false,
  })
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)
  const [lastRequest, setLastRequest] = useState<string | null>(null)
  const [lastResponse, setLastResponse] = useState<string | null>(null)
  const animeSaveActionRef = useRef<(() => void) | null>(null)
  const episodeSaveActionRef = useRef<(() => void) | null>(null)

  const handledInitialContextParamRef = useRef(false)
  const contextCardAnchorRef = useRef<HTMLDivElement>(null)
  const animePatchAnchorRef = useRef<HTMLDivElement>(null)

  const messages = useAdminMessages()
  const browser = useAnimeBrowser({ onError: messages.setError })
  const context = useAnimeContext()
  const jellyfin = useJellyfinSync(authToken, messages.setSuccess, messages.setError)

  const hasAuthToken = authToken.trim().length > 0
  const selectedAnimeId = context.anime?.id ?? null
  const selectedEpisodeId = episodeEditorState.selectedEpisodeId
  const hasUnsavedChanges = editorMode === 'anime' ? animeEditorState.hasUnsavedChanges : episodeEditorState.hasUnsavedChanges
  const isSaving = editorMode === 'anime' ? animeEditorState.isSaving : episodeEditorState.isSaving
  const uiMode = useMemo<'navigation' | 'editing'>(() => {
    if (isSaving || hasUnsavedChanges || (editorMode === 'episode' && selectedEpisodeId !== null)) {
      return 'editing'
    }
    return 'navigation'
  }, [editorMode, hasUnsavedChanges, isSaving, selectedEpisodeId])

  const uiState = useMemo<'idle' | 'editing' | 'unsaved' | 'saving' | 'saved' | 'error'>(() => {
    if (messages.error) return 'error'
    if (isSaving) return 'saving'
    if (hasUnsavedChanges) return 'unsaved'
    if (uiMode === 'editing') return 'editing'
    if (lastSavedAt) return 'saved'
    return 'idle'
  }, [hasUnsavedChanges, isSaving, lastSavedAt, messages.error, uiMode])
  const tokenPreview = useMemo(() => {
    if (!authToken) return 'n/a'
    return authToken.length > 24 ? `${authToken.slice(0, 24)}...` : authToken
  }, [authToken])

  const clearMessageAndPayload = useCallback(() => {
    messages.clear()
    setLastRequest(null)
    setLastResponse(null)
  }, [messages])

  const loadContextAnime = useCallback(
    async (animeID: number, successMessage: string) => {
      await context.load(animeID)
      setContextAnimeIDInput(String(animeID))
      messages.setSuccess(successMessage)
      setTimeout(() => {
        contextCardAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 0)
    },
    [context, messages],
  )

  useEffect(() => {
    if (handledInitialContextParamRef.current) return
    handledInitialContextParamRef.current = true
    if (typeof window === 'undefined') return

    const params = new URLSearchParams(window.location.search)
    const raw = (params.get('context') || '').trim()
    if (!raw) return

    const animeID = parsePositiveInt(raw)
    if (!animeID) return

    context
      .load(animeID)
      .then(() => {
        setContextAnimeIDInput(String(animeID))
        messages.setSuccess(`Anime-Kontext #${animeID} geladen.`)
      })
      .catch((error) => {
        messages.setError(formatError(error, 'Anime-Kontext konnte nicht geladen werden.'))
      })
      .finally(() => {
        window.history.replaceState(null, '', '/admin/anime')
      })
  }, [context, messages])

  const handleSelectAnimeFromBrowser = useCallback(
    async (animeID: number) => {
      messages.clear()
      try {
        await loadContextAnime(animeID, `Anime-Kontext #${animeID} geladen.`)
        setEditorMode('anime')
      } catch (error) {
        messages.setError(formatError(error, 'Anime-Kontext konnte nicht geladen werden.'))
      }
    },
    [loadContextAnime, messages],
  )

  const handleContextSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    messages.clear()

    if (!hasAuthToken) {
      messages.setError('Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.')
      return
    }

    const animeID = parsePositiveInt(contextAnimeIDInput)
    if (!animeID) {
      messages.setError('Bitte eine gueltige Anime-ID fuer den Kontext angeben.')
      return
    }

    try {
      await loadContextAnime(animeID, `Anime-Kontext #${animeID} geladen.`)
    } catch (error) {
      context.clear()
      messages.setError(formatError(error, 'Anime-Kontext konnte nicht geladen werden.'))
    }
  }

  const handleAnimeRowSync = async (anime: AnimeListItem) => {
    messages.clear()
    await jellyfin.syncRow(anime, context.anime?.id === anime.id ? jellyfin.selectedSeriesID : undefined)

    await browser.refresh().catch(() => {
      // handled via hook callback
    })
    if (context.anime?.id === anime.id) {
      await context.load(anime.id).catch(() => {
        // handled via hook callback
      })
    }
  }

  const handleGlobalSync = async () => {
    messages.clear()

    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(
        `Alle Treffer synchronisieren? (${browser.total} Anime, Seiten: ${browser.totalPages})\nDas kann je nach Umfang laenger dauern.`,
      )
      if (!confirmed) return
    }

    await jellyfin.syncGlobal({
      total: browser.total,
      totalPages: browser.totalPages,
      page: browser.page,
      letter: browser.letter,
      query: browser.query,
      hasCover: browser.hasCover,
      currentPageItems: browser.items,
      contextAnimeID: context.anime?.id ?? null,
      onContextTouched: async (animeID) => {
        await context.load(animeID)
      },
      onBrowserRefresh: browser.refresh,
    })
  }

  const handleContextRefresh = async () => {
    if (!context.anime) return
    await context.load(context.anime.id)
  }

  return (
    <main className={styles.page}>
      <p className={styles.backLinks}>
        <Link href="/admin">Admin</Link>
        <span> | </span>
        <Link href="/auth">Auth</Link>
        <span> | </span>
        <Link href="/anime">Anime</Link>
      </p>

      <header className={styles.header}>
        <h1 className={styles.title}>Admin Studio: Anime + Episoden</h1>
        <p className={styles.subtitle}>Workflow: Anime waehlen -&gt; Kontext laden -&gt; Episode waehlen -&gt; bearbeiten -&gt; speichern.</p>
        <p className={styles.tokenPreview}>Token: {hasAuthToken ? tokenPreview : 'nicht vorhanden'}</p>
        <p className={styles.hint}>
          Zustand: {uiState} | uiMode: {uiMode} | selectedAnimeId: {selectedAnimeId ?? '-'} | selectedEpisodeId:{' '}
          {selectedEpisodeId ?? '-'} | hasUnsavedChanges: {hasUnsavedChanges ? 'ja' : 'nein'} | isSaving:{' '}
          {isSaving ? 'ja' : 'nein'}
        </p>
      </header>

      {!hasAuthToken ? <div className={styles.errorBox}>Kein Access-Token gefunden. Bitte zuerst auf /auth anmelden.</div> : null}

      <MessageToast error={messages.error} success={messages.success} onDismiss={messages.clear} />

      <details className={styles.details}>
        <summary>Diagnose (Request / Response)</summary>
        <div className={styles.detailsInner}>
          {lastRequest ? (
            <pre className={styles.resultBox}>
              {'LAST REQUEST\n'}
              {lastRequest}
            </pre>
          ) : null}
          {lastResponse ? (
            <pre className={styles.resultBox}>
              {'LAST RESPONSE\n'}
              {lastResponse}
            </pre>
          ) : null}
        </div>
      </details>

      <AdminLayout
        uiMode={uiMode}
        browser={
          <AnimeBrowserPanel>
            <AnimeBrowser
              items={browser.items}
              page={browser.page}
              totalPages={browser.totalPages}
              total={browser.total}
              query={browser.query}
              letter={browser.letter}
              hasCover={browser.hasCover}
              isLoading={browser.isLoading}
              coverFailures={browser.coverFailures}
              activeAnimeID={context.anime?.id ?? null}
              isLoadingContext={context.isLoading}
              hasAuthToken={hasAuthToken}
              isSyncing={jellyfin.isSyncing}
              isBulkSyncing={jellyfin.isBulkSyncing}
              syncingAnimeIDs={jellyfin.syncingAnimeIDs}
              bulkProgress={jellyfin.bulkProgress}
              onSetPage={browser.setPage}
              onSetQuery={browser.setQuery}
              onSetLetter={browser.setLetter}
              onSetHasCover={browser.setHasCover}
              onRefresh={browser.refresh}
              onSelectAnime={(id) => {
                void handleSelectAnimeFromBrowser(id)
              }}
              onSyncAnime={(anime) => {
                void handleAnimeRowSync(anime)
              }}
              onSyncAll={() => {
                void handleGlobalSync()
              }}
              onMarkCoverFailure={browser.markCoverFailure}
              uiMode={uiMode}
            />
          </AnimeBrowserPanel>
        }
        context={
          <ActiveContextPanel>
            <AnimeContextCard
              anime={context.anime}
              fansubs={context.fansubs}
              authToken={authToken}
              isLoading={context.isLoading}
              isLoadingFansubs={context.isLoadingFansubs}
              contextAnimeIDInput={contextAnimeIDInput}
              onContextAnimeIDInputChange={setContextAnimeIDInput}
              onSubmitContext={(event) => {
                void handleContextSubmit(event)
              }}
              onRefreshFansubs={handleContextRefresh}
              onSuccess={messages.setSuccess}
              onError={messages.setError}
              onJumpToPatch={() => {
                setEditorMode('anime')
                animePatchAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
              onJumpToEpisodes={() => {
                setEditorMode('episode')
                const section = document.getElementById('admin-anime-episodes')
                section?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                setTimeout(() => {
                  const input = document.getElementById('episode-filter') as HTMLInputElement | null
                  input?.focus()
                }, 150)
              }}
              contextAnchorRef={contextCardAnchorRef}
            />
          </ActiveContextPanel>
        }
        editor={
          <EditorPanel
            editorMode={editorMode}
            canEditEpisode={Boolean(context.anime)}
            uiState={uiState}
            hasUnsavedChanges={hasUnsavedChanges}
            isSaving={isSaving}
            onEditorModeChange={setEditorMode}
            onSave={() => {
              messages.clear()
              const saveAction = editorMode === 'anime' ? animeSaveActionRef.current : episodeSaveActionRef.current
              saveAction?.()
            }}
          >
            <div ref={animePatchAnchorRef} />
            {editorMode === 'anime' ? (
              <>
                <AnimeEditor
                  anime={context.anime}
                  authToken={authToken}
                  onSuccess={async (anime) => {
                    await context.load(anime.id)
                    await browser.refresh().catch(() => {
                      // handled via hook callback
                    })
                    messages.setSuccess(`Anime #${anime.id} wurde aktualisiert.`)
                    setLastSavedAt(Date.now())
                  }}
                  onError={messages.setError}
                  onRequest={setLastRequest}
                  onResponse={setLastResponse}
                  onEditorStateChange={setAnimeEditorState}
                  onRegisterSaveAction={(saveAction) => {
                    animeSaveActionRef.current = saveAction
                  }}
                />
                {context.anime && uiMode === 'navigation' ? (
                  <details className={styles.details}>
                    <summary>Weitere Aktionen</summary>
                    <div className={styles.detailsInner}>
                      <JellyfinSyncPanel
                        anime={context.anime}
                        model={jellyfin}
                        onBeforeAction={messages.clear}
                        onSynced={async () => {
                          await handleContextRefresh()
                          await browser.refresh().catch(() => {
                            // handled via hook callback
                          })
                        }}
                      />
                    </div>
                  </details>
                ) : null}
              </>
            ) : context.anime ? (
              <EpisodeManager
                anime={context.anime}
                fansubs={context.fansubs}
                authToken={authToken}
                onRefresh={handleContextRefresh}
                onSuccess={(msg) => {
                  messages.setSuccess(msg)
                  setLastSavedAt(Date.now())
                }}
                onError={messages.setError}
                onRequest={setLastRequest}
                onResponse={setLastResponse}
                onEditorStateChange={setEpisodeEditorState}
                onRegisterSaveAction={(saveAction) => {
                  episodeSaveActionRef.current = saveAction
                }}
              />
            ) : (
              <section className={`${styles.panel} ${styles.editPanel}`}>
                <p className={styles.hint}>Bitte zuerst einen Anime im Browser waehlen und den Kontext laden.</p>
              </section>
            )}
          </EditorPanel>
        }
      />

      <div className={styles.actions}>
        <button className={styles.buttonSecondary} type="button" onClick={clearMessageAndPayload}>
          Meldungen + Request/Response leeren
        </button>
      </div>
    </main>
  )
}
