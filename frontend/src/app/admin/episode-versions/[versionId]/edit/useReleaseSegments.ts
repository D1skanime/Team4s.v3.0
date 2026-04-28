'use client'

import { useCallback, useEffect, useState } from 'react'

import {
  getAnimeSegments,
  createAnimeSegment,
  updateAnimeSegment,
  deleteAnimeSegment,
  getAdminAnimeThemes,
  getAdminThemeTypes,
  createAdminAnimeTheme,
  getRuntimeAuthToken,
} from '@/lib/api'
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
}

export type GenericSegmentThemeKind = 'op' | 'ed' | 'insert' | 'outro'

export interface GenericSegmentThemeOption {
  key: GenericSegmentThemeKind
  label: string
  preferredThemeTypeId: number
}

const GENERIC_THEME_ORDER: GenericSegmentThemeKind[] = ['op', 'ed', 'insert', 'outro']

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
          ? 'Opening (OP)'
          : kind === 'ed'
            ? 'Ending (ED)'
            : kind === 'insert'
              ? 'Insert Song'
              : 'Outro',
      preferredThemeTypeId: themeType.id,
    })
  }

  return GENERIC_THEME_ORDER
    .map((kind) => byKind.get(kind))
    .filter((option): option is GenericSegmentThemeOption => Boolean(option))
}

export function useReleaseSegments({ animeId, groupId, version }: UseReleaseSegmentsOptions) {
  const [authToken] = useState(() => getRuntimeAuthToken())
  const [segments, setSegments] = useState<AdminThemeSegment[]>([])
  const [themes, setThemes] = useState<AdminAnimeTheme[]>([])
  const [themeTypes, setThemeTypes] = useState<AdminThemeType[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!animeId || !authToken) return
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const [segRes, themeRes, themeTypesRes] = await Promise.all([
        getAnimeSegments(animeId, groupId, version, authToken),
        getAdminAnimeThemes(animeId, authToken),
        getAdminThemeTypes(authToken),
      ])
      setSegments(segRes.data)
      setThemes(themeRes.data)
      setThemeTypes(themeTypesRes.data)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Fehler beim Laden der Segmente.')
    } finally {
      setIsLoading(false)
    }
  }, [animeId, groupId, version, authToken])

  useEffect(() => { void load() }, [load])

  async function ensureThemeFromSelection(selection: string, title: string): Promise<number | null> {
    if (!animeId || !authToken) return null
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
      authToken,
    )
    setThemes((current) => [...current, response.data])
    return response.data.id
  }

  async function create(input: AdminThemeSegmentCreateRequest): Promise<AdminThemeSegment | null> {
    if (!animeId || !authToken) return null
    try {
      const res = await createAnimeSegment(animeId, input, authToken)
      setSegments((current) => [...current, res.data])
      return res.data
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Segment konnte nicht angelegt werden.')
      return null
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
    reload: load,
    ensureThemeFromSelection,
  }
}
