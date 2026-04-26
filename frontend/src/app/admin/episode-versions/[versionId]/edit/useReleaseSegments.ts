'use client'

import { useCallback, useEffect, useState } from 'react'

import {
  getAnimeSegments,
  createAnimeSegment,
  updateAnimeSegment,
  deleteAnimeSegment,
  getAdminAnimeThemes,
  getRuntimeAuthToken,
} from '@/lib/api'
import type { AdminThemeSegment, AdminThemeSegmentCreateRequest, AdminThemeSegmentPatchRequest, AdminAnimeTheme } from '@/types/admin'

interface UseReleaseSegmentsOptions {
  animeId: number | null
  groupId: number | null
  version: string | null
}

export function useReleaseSegments({ animeId, groupId, version }: UseReleaseSegmentsOptions) {
  const [authToken] = useState(() => getRuntimeAuthToken())
  const [segments, setSegments] = useState<AdminThemeSegment[]>([])
  const [themes, setThemes] = useState<AdminAnimeTheme[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!animeId || !authToken) return
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const [segRes, themeRes] = await Promise.all([
        getAnimeSegments(animeId, groupId, version, authToken),
        getAdminAnimeThemes(animeId, authToken),
      ])
      setSegments(segRes.data)
      setThemes(themeRes.data)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Fehler beim Laden der Segmente.')
    } finally {
      setIsLoading(false)
    }
  }, [animeId, groupId, version, authToken])

  useEffect(() => { void load() }, [load])

  async function create(input: AdminThemeSegmentCreateRequest): Promise<boolean> {
    if (!animeId || !authToken) return false
    try {
      const res = await createAnimeSegment(animeId, input, authToken)
      setSegments((current) => [...current, res.data])
      return true
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Segment konnte nicht angelegt werden.')
      return false
    }
  }

  async function update(segmentId: number, input: AdminThemeSegmentPatchRequest): Promise<boolean> {
    if (!animeId || !authToken) return false
    try {
      await updateAnimeSegment(animeId, segmentId, input, authToken)
      await load()
      return true
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Segment konnte nicht aktualisiert werden.')
      return false
    }
  }

  async function remove(segmentId: number): Promise<boolean> {
    if (!animeId || !authToken) return false
    try {
      await deleteAnimeSegment(animeId, segmentId, authToken)
      setSegments((current) => current.filter((s) => s.id !== segmentId))
      return true
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Segment konnte nicht geloescht werden.')
      return false
    }
  }

  return { segments, themes, isLoading, errorMessage, create, update, remove, reload: load }
}
