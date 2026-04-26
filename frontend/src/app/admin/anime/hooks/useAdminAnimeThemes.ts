'use client'

import { useEffect, useState } from 'react'

import {
  createAdminAnimeTheme,
  createAdminAnimeThemeSegment,
  deleteAdminAnimeTheme,
  deleteAdminAnimeThemeSegment,
  getAdminAnimeThemeSegments,
  getAdminAnimeThemes,
  getAdminThemeTypes,
  updateAdminAnimeTheme,
} from '@/lib/api'
import { AdminAnimeTheme, AdminAnimeThemeSegment, AdminThemeType } from '@/types/admin'

export interface UseAdminAnimeThemesModel {
  themes: AdminAnimeTheme[]
  themeTypes: AdminThemeType[]
  isLoading: boolean
  isSaving: boolean
  errorMessage: string | null
  inlineError: string | null
  newTypeID: number
  newTitle: string
  setNewTypeID: (id: number) => void
  setNewTitle: (title: string) => void
  createTheme: () => Promise<void>
  deleteTheme: (themeID: number) => Promise<void>
  editingThemeID: number | null
  editingTypeID: number
  editingTitle: string
  startEditing: (theme: AdminAnimeTheme) => void
  cancelEditing: () => void
  setEditingTypeID: (id: number) => void
  setEditingTitle: (title: string) => void
  saveEditing: () => Promise<void>
  segments: Map<number, AdminAnimeThemeSegment[]>
  loadSegments: (themeID: number) => Promise<void>
  createSegment: (themeID: number, startEpisodeID: number | null, endEpisodeID: number | null) => Promise<void>
  deleteSegment: (themeID: number, segmentID: number) => Promise<void>
}

interface UseAdminAnimeThemesOptions {
  animeID: number
  authToken: string
  onSuccess?: (message: string) => void
  onError?: (message: string) => void
}

export async function loadAdminAnimeThemesData(animeID: number, authToken: string) {
  const [themesResponse, typesResponse] = await Promise.all([
    getAdminAnimeThemes(animeID, authToken),
    getAdminThemeTypes(authToken),
  ])

  return {
    themes: themesResponse.data,
    themeTypes: typesResponse.data,
  }
}

function formatErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim() ? error.message : fallback
}

export function useAdminAnimeThemes({
  animeID,
  authToken,
  onSuccess,
  onError,
}: UseAdminAnimeThemesOptions): UseAdminAnimeThemesModel {
  const [themes, setThemes] = useState<AdminAnimeTheme[]>([])
  const [themeTypes, setThemeTypes] = useState<AdminThemeType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [inlineError, setInlineError] = useState<string | null>(null)
  const [newTypeID, setNewTypeID] = useState(0)
  const [newTitle, setNewTitle] = useState('')
  const [editingThemeID, setEditingThemeID] = useState<number | null>(null)
  const [editingTypeID, setEditingTypeID] = useState(0)
  const [editingTitle, setEditingTitle] = useState('')
  const [segments, setSegments] = useState<Map<number, AdminAnimeThemeSegment[]>>(new Map())

  useEffect(() => {
    let active = true
    setIsLoading(true)

    loadAdminAnimeThemesData(animeID, authToken)
      .then(({ themes: loadedThemes, themeTypes: loadedThemeTypes }) => {
        if (!active) return
        setThemes(loadedThemes)
        setThemeTypes(loadedThemeTypes)
        const defaultTypeID = loadedThemeTypes[0]?.id ?? 0
        setNewTypeID((current) => (current > 0 ? current : defaultTypeID))
        setEditingTypeID((current) => (current > 0 ? current : defaultTypeID))
      })
      .catch((error) => {
        if (!active) return
        const message = formatErrorMessage(error, 'Themes konnten nicht geladen werden.')
        setErrorMessage(message)
        onError?.(message)
      })
      .finally(() => {
        if (active) {
          setIsLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [animeID, authToken, onError])

  function clearMessages() {
    setInlineError(null)
    setErrorMessage(null)
  }

  async function reloadThemes(): Promise<void> {
    const response = await getAdminAnimeThemes(animeID, authToken)
    setThemes(response.data)
  }

  async function createTheme(): Promise<void> {
    clearMessages()
    if (newTypeID <= 0) {
      setInlineError('Bitte zuerst einen Theme-Typ waehlen.')
      return
    }

    setIsSaving(true)
    try {
      const payload = newTitle.trim() ? { theme_type_id: newTypeID, title: newTitle.trim() } : { theme_type_id: newTypeID }
      const response = await createAdminAnimeTheme(animeID, payload, authToken)
      setThemes((current) => [...current, response.data])
      setNewTitle('')
      onSuccess?.('Theme gespeichert.')
    } catch (error) {
      const message = formatErrorMessage(error, 'Theme konnte nicht gespeichert werden.')
      setErrorMessage(message)
      onError?.(message)
    } finally {
      setIsSaving(false)
    }
  }

  async function deleteTheme(themeID: number): Promise<void> {
    clearMessages()
    setIsSaving(true)
    try {
      await deleteAdminAnimeTheme(animeID, themeID, authToken)
      setThemes((current) => current.filter((theme) => theme.id !== themeID))
      setSegments((current) => {
        const next = new Map(current)
        next.delete(themeID)
        return next
      })
      if (editingThemeID === themeID) {
        setEditingThemeID(null)
      }
      onSuccess?.('Theme geloescht.')
    } catch (error) {
      const message = formatErrorMessage(error, 'Theme konnte nicht geloescht werden.')
      setErrorMessage(message)
      onError?.(message)
    } finally {
      setIsSaving(false)
    }
  }

  function startEditing(theme: AdminAnimeTheme) {
    clearMessages()
    setEditingThemeID(theme.id)
    setEditingTypeID(theme.theme_type_id)
    setEditingTitle(theme.title ?? '')
  }

  function cancelEditing() {
    clearMessages()
    setEditingThemeID(null)
    setEditingTitle('')
    setEditingTypeID(themeTypes[0]?.id ?? 0)
  }

  async function saveEditing(): Promise<void> {
    if (editingThemeID == null) return
    clearMessages()
    setIsSaving(true)
    try {
      const payload = editingTitle.trim()
        ? { theme_type_id: editingTypeID, title: editingTitle.trim() }
        : { theme_type_id: editingTypeID, title: '' }
      await updateAdminAnimeTheme(animeID, editingThemeID, payload, authToken)
      await reloadThemes()
      setEditingThemeID(null)
      onSuccess?.('Theme aktualisiert.')
    } catch (error) {
      const message = formatErrorMessage(error, 'Theme konnte nicht aktualisiert werden.')
      setErrorMessage(message)
      onError?.(message)
    } finally {
      setIsSaving(false)
    }
  }

  async function loadSegments(themeID: number): Promise<void> {
    try {
      const response = await getAdminAnimeThemeSegments(animeID, themeID, authToken)
      setSegments((current) => {
        const next = new Map(current)
        next.set(themeID, response.data)
        return next
      })
    } catch (error) {
      const message = formatErrorMessage(error, 'Theme-Segmente konnten nicht geladen werden.')
      setErrorMessage(message)
      onError?.(message)
    }
  }

  async function createSegment(themeID: number, startEpisodeID: number | null, endEpisodeID: number | null): Promise<void> {
    clearMessages()
    setIsSaving(true)
    try {
      const response = await createAdminAnimeThemeSegment(
        animeID,
        themeID,
        {
          start_episode_id: startEpisodeID,
          end_episode_id: endEpisodeID,
        },
        authToken,
      )
      setSegments((current) => {
        const next = new Map(current)
        const items = next.get(themeID) ?? []
        next.set(themeID, [...items, response.data])
        return next
      })
      onSuccess?.('Episodenbereich gespeichert.')
    } catch (error) {
      const message = formatErrorMessage(error, 'Episodenbereich konnte nicht gespeichert werden.')
      setErrorMessage(message)
      onError?.(message)
    } finally {
      setIsSaving(false)
    }
  }

  async function removeSegment(themeID: number, segmentID: number): Promise<void> {
    clearMessages()
    setIsSaving(true)
    try {
      await deleteAdminAnimeThemeSegment(animeID, themeID, segmentID, authToken)
      setSegments((current) => {
        const next = new Map(current)
        next.set(
          themeID,
          (next.get(themeID) ?? []).filter((segment) => segment.id !== segmentID),
        )
        return next
      })
      onSuccess?.('Episodenbereich geloescht.')
    } catch (error) {
      const message = formatErrorMessage(error, 'Episodenbereich konnte nicht geloescht werden.')
      setErrorMessage(message)
      onError?.(message)
    } finally {
      setIsSaving(false)
    }
  }

  return {
    themes,
    themeTypes,
    isLoading,
    isSaving,
    errorMessage,
    inlineError,
    newTypeID,
    newTitle,
    setNewTypeID,
    setNewTitle,
    createTheme,
    deleteTheme,
    editingThemeID,
    editingTypeID,
    editingTitle,
    startEditing,
    cancelEditing,
    setEditingTypeID,
    setEditingTitle,
    saveEditing,
    segments,
    loadSegments,
    createSegment,
    deleteSegment: removeSegment,
  }
}
