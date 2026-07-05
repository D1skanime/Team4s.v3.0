'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import {
  getAnimeSegments,
  createAnimeSegment,
  updateAnimeSegment,
  deleteAnimeSegment,
  getAdminAnimeThemes,
  getAdminThemeTypes,
  createAdminAnimeTheme,
  renderAnimeSegment,
} from '@/lib/api'
import { useAuthSession } from '@/lib/useAuthSession'
import type {
  AdminThemeSegment,
  AdminThemeSegmentCreateRequest,
  AdminThemeSegmentPatchRequest,
  AdminAnimeTheme,
  AdminThemeType,
} from '@/types/admin'

interface UseReleaseSegmentsOptions {
  animeId: number | null
  groupId: number | null
  version: string | null
  releaseVariantId?: number | null
}

export type GenericSegmentThemeKind = 'op' | 'ed' | 'insert' | 'outro'

export interface GenericSegmentThemeOption {
  key: GenericSegmentThemeKind
  label: string
  preferredThemeTypeId: number
}

const GENERIC_THEME_ORDER: GenericSegmentThemeKind[] = ['op', 'ed', 'insert', 'outro']

/** Render-Status-Werte, bei denen das Polling gestoppt wird (terminale Zustaende). */
const SEGMENT_RENDER_TERMINAL_STATUSES = new Set(['ready', 'failed', 'stale'])

/** Poll-Intervall waehrend ein Segment-Render laeuft (queued/rendering). */
const SEGMENT_RENDER_POLL_INTERVAL_MS = 3000

/** Maximale Wartezeit fuers Polling, bevor aufgegeben wird (Render laeuft serverseitig weiter). */
const SEGMENT_RENDER_POLL_MAX_WAIT_MS = 5 * 60 * 1000

function normalizeThemeName(value: string | null | undefined): string {
  return (value ?? '').trim().toLocaleLowerCase()
}

function classifyThemeTypeName(themeTypeName: string | null | undefined): GenericSegmentThemeKind | null {
  const normalized = normalizeThemeName(themeTypeName)
  if (!normalized) return null
  if (normalized.includes('op')) return 'op'
  if (normalized.includes('ed')) return 'ed'
  if (normalized.includes('insert')) return 'insert'
  if (normalized.includes('outro')) return 'outro'
  return null
}

function deriveGenericThemeOptions(themeTypes: AdminThemeType[]): GenericSegmentThemeOption[] {
  const byKind = new Map<GenericSegmentThemeKind, GenericSegmentThemeOption>()

  for (const themeType of themeTypes) {
    const kind = classifyThemeTypeName(themeType.name)
    if (!kind || byKind.has(kind)) continue

    byKind.set(kind, {
      key: kind,
      label:
        kind === 'op'
          ? 'OP Kara'
          : kind === 'ed'
            ? 'ED Kara'
            : kind === 'insert'
              ? 'Insert Kara'
              : 'Outro',
      preferredThemeTypeId: themeType.id,
    })
  }

  return GENERIC_THEME_ORDER
    .map((kind) => byKind.get(kind))
    .filter((option): option is GenericSegmentThemeOption => Boolean(option))
}

export function useReleaseSegments({ animeId, groupId, version, releaseVariantId }: UseReleaseSegmentsOptions) {
  const { hasAccessToken, hasRefreshToken } = useAuthSession()
  const hasAuthSession = hasAccessToken || hasRefreshToken
  const [segments, setSegments] = useState<AdminThemeSegment[]>([])
  const [themes, setThemes] = useState<AdminAnimeTheme[]>([])
  const [themeTypes, setThemeTypes] = useState<AdminThemeType[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const load = useCallback(async () => {
    if (!animeId || !hasAuthSession) return
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const segRes = await getAnimeSegments(animeId, groupId, version, undefined, releaseVariantId)
      setSegments(segRes.data)

      const [themeRes, themeTypesRes] = await Promise.allSettled([
        getAdminAnimeThemes(animeId),
        getAdminThemeTypes(),
      ])

      setThemes(themeRes.status === 'fulfilled' ? themeRes.value.data : [])
      setThemeTypes(themeTypesRes.status === 'fulfilled' ? themeTypesRes.value.data : [])
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Fehler beim Laden der Segmente.')
    } finally {
      setIsLoading(false)
    }
  }, [animeId, groupId, version, hasAuthSession, releaseVariantId])

  useEffect(() => { void load() }, [load])

  async function ensureThemeFromSelection(selection: string, title: string): Promise<number | null> {
    if (!animeId || !hasAuthSession) return null
    const selectedKind = selection.trim().toLocaleLowerCase() as GenericSegmentThemeKind
    if (!selectedKind) return null

    const genericThemeOptions = deriveGenericThemeOptions(themeTypes)
    const option = genericThemeOptions.find((entry) => entry.key === selectedKind)
    if (!option) return null

    const normalizedTitle = title.trim()
    const existingTheme = themes.find((theme) => {
      return (
        classifyThemeTypeName(theme.theme_type_name) === selectedKind &&
        normalizeThemeName(theme.title) === normalizeThemeName(normalizedTitle)
      )
    })
    if (existingTheme) {
      return existingTheme.id
    }

    const response = await createAdminAnimeTheme(
      animeId,
      {
        theme_type_id: option.preferredThemeTypeId,
        title: normalizedTitle || undefined,
      },
      undefined,
      releaseVariantId,
    )
    setThemes((current) => [...current, response.data])
    return response.data.id
  }

  async function create(input: AdminThemeSegmentCreateRequest): Promise<AdminThemeSegment | null> {
    if (!animeId || !hasAuthSession) return null
    try {
      const res = await createAnimeSegment(animeId, input, undefined, releaseVariantId)
      setSegments((current) => [...current, res.data])
      return res.data
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Segment konnte nicht angelegt werden.')
      return null
    }
  }

  async function update(segmentId: number, input: AdminThemeSegmentPatchRequest): Promise<{ data: AdminThemeSegment } | null> {
    if (!animeId || !hasAuthSession) return null
    try {
      const res = await updateAnimeSegment(animeId, segmentId, input, undefined, releaseVariantId)
      await load()
      return res
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Segment konnte nicht aktualisiert werden.')
      return null
    }
  }

  async function remove(segmentId: number): Promise<boolean> {
    if (!animeId || !hasAuthSession) return false
    try {
      await deleteAnimeSegment(animeId, segmentId, undefined, releaseVariantId)
      setSegments((current) => current.filter((s) => s.id !== segmentId))
      return true
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Segment konnte nicht gelöscht werden.')
      return false
    }
  }

  /**
   * Fragt die Segmentliste ab und aktualisiert den State, ohne Themes/ThemeTypes neu zu laden
   * (die aendern sich waehrend eines Renders nicht). Wird vom Render-Polling wiederholt aufgerufen.
   */
  const refreshSegmentsOnly = useCallback(async (): Promise<AdminThemeSegment[] | null> => {
    if (!animeId || !hasAuthSession) return null
    try {
      const segRes = await getAnimeSegments(animeId, groupId, version, undefined, releaseVariantId)
      if (isMountedRef.current) {
        setSegments(segRes.data)
      }
      return segRes.data
    } catch (error) {
      if (isMountedRef.current) {
        setErrorMessage(error instanceof Error ? error.message : 'Fehler beim Laden der Segmente.')
      }
      return null
    }
  }, [animeId, groupId, version, hasAuthSession, releaseVariantId])

  /**
   * Pollt die Segmentliste, bis das Ziel-Segment einen terminalen Render-Status erreicht hat
   * (ready/failed/stale) oder die maximale Wartezeit abgelaufen ist. Der Render selbst laeuft
   * asynchron im Backend-Worker weiter (Endpoint antwortet sofort mit 202 + queued); dieses
   * Polling sorgt nur dafuer, dass die UI queued -> rendering -> ready live nachzieht.
   */
  async function pollSegmentRenderStatus(segmentId: number): Promise<void> {
    const startedAt = Date.now()
    while (isMountedRef.current && Date.now() - startedAt < SEGMENT_RENDER_POLL_MAX_WAIT_MS) {
      await new Promise((resolve) => setTimeout(resolve, SEGMENT_RENDER_POLL_INTERVAL_MS))
      if (!isMountedRef.current) return

      const latest = await refreshSegmentsOnly()
      if (!latest) return

      const target = latest.find((s) => s.id === segmentId)
      const status = target?.render_status ?? null
      if (status && SEGMENT_RENDER_TERMINAL_STATUSES.has(status)) {
        return
      }
    }
  }

  async function render(segmentId: number): Promise<boolean> {
    if (!animeId || !hasAuthSession) return false
    try {
      await renderAnimeSegment(segmentId)
      // Erste Aktualisierung sofort (zeigt 'queued'), danach Live-Polling bis zu einem
      // terminalen Status oder Timeout. Fehler im Polling selbst werden dort behandelt.
      await refreshSegmentsOnly()
      void pollSegmentRenderStatus(segmentId)
      return true
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Segment konnte nicht vorbereitet werden.')
      await refreshSegmentsOnly()
      return false
    }
  }

  return {
    segments,
    themes,
    themeTypes,
    genericThemeOptions: deriveGenericThemeOptions(themeTypes),
    classifyThemeTypeName,
    isLoading,
    errorMessage,
    create,
    update,
    remove,
    render,
    reload: load,
    ensureThemeFromSelection,
  }
}
