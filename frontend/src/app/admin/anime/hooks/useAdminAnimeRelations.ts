'use client'

import { useEffect, useState } from 'react'

import {
  createAdminAnimeRelation,
  deleteAdminAnimeRelation,
  getAdminAnimeRelations,
  searchAdminAnimeRelationTargets,
  updateAdminAnimeRelation,
} from '@/lib/api'
import {
  AdminAnimeRelation,
  AdminAnimeRelationLabel,
  AdminAnimeRelationTarget,
} from '@/types/admin'

const DEFAULT_LABEL: AdminAnimeRelationLabel = 'Fortsetzung'

export interface UseAdminAnimeRelationsModel {
  relations: AdminAnimeRelation[]
  isLoading: boolean
  isSearching: boolean
  isSaving: boolean
  query: string
  targets: AdminAnimeRelationTarget[]
  selectedTarget: AdminAnimeRelationTarget | null
  relationLabel: AdminAnimeRelationLabel
  editingTargetID: number | null
  editingLabel: AdminAnimeRelationLabel
  inlineError: string | null
  errorMessage: string | null
  setQuery: (value: string) => void
  selectTarget: (target: AdminAnimeRelationTarget) => void
  setRelationLabel: (value: AdminAnimeRelationLabel) => void
  createRelation: () => Promise<void>
  startEditing: (relation: AdminAnimeRelation) => void
  cancelEditing: () => void
  setEditingLabel: (value: AdminAnimeRelationLabel) => void
  saveEditing: () => Promise<void>
  deleteRelation: (targetAnimeID: number) => Promise<void>
  clearMessages: () => void
}

interface UseAdminAnimeRelationsOptions {
  animeID: number
  authToken: string
  onSuccess?: (message: string) => void
  onError?: (message: string) => void
}

export function buildRelationsSummary(relations: AdminAnimeRelation[], errorMessage: string | null): string {
  const countLabel = relations.length === 1 ? '1 Relation' : `${relations.length} Relationen`
  if (errorMessage) {
    return `${countLabel} | Fehler vorhanden`
  }

  return countLabel
}

export function useAdminAnimeRelations({
  animeID,
  authToken,
  onSuccess,
  onError,
}: UseAdminAnimeRelationsOptions): UseAdminAnimeRelationsModel {
  const [relations, setRelations] = useState<AdminAnimeRelation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [query, setQuery] = useState('')
  const [targets, setTargets] = useState<AdminAnimeRelationTarget[]>([])
  const [selectedTarget, setSelectedTarget] = useState<AdminAnimeRelationTarget | null>(null)
  const [relationLabel, setRelationLabel] = useState<AdminAnimeRelationLabel>(DEFAULT_LABEL)
  const [editingTargetID, setEditingTargetID] = useState<number | null>(null)
  const [editingLabel, setEditingLabel] = useState<AdminAnimeRelationLabel>(DEFAULT_LABEL)
  const [inlineError, setInlineError] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setIsLoading(true)

    getAdminAnimeRelations(animeID, authToken)
      .then((response) => {
        if (!active) return
        setRelations(response.data)
      })
      .catch((error) => {
        if (!active) return
        const message = error instanceof Error && error.message.trim() ? error.message : 'Relationen konnten nicht geladen werden.'
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

  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed) {
      setTargets([])
      setIsSearching(false)
      return
    }

    let active = true
    const timer = window.setTimeout(() => {
      setIsSearching(true)
      searchAdminAnimeRelationTargets(animeID, trimmed, { limit: 8 }, authToken)
        .then((response) => {
          if (!active) return
          setTargets(response.data)
        })
        .catch((error) => {
          if (!active) return
          const message = error instanceof Error && error.message.trim() ? error.message : 'Ziel-Anime konnten nicht gesucht werden.'
          setErrorMessage(message)
          onError?.(message)
          setTargets([])
        })
        .finally(() => {
          if (active) {
            setIsSearching(false)
          }
        })
    }, 250)

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [animeID, authToken, onError, query])

  function clearMessages() {
    setInlineError(null)
    setErrorMessage(null)
  }

  async function reloadRelations(): Promise<void> {
    const response = await getAdminAnimeRelations(animeID, authToken)
    setRelations(response.data)
  }

  async function createRelation(): Promise<void> {
    clearMessages()
    if (!selectedTarget) {
      setInlineError('Bitte zuerst ein Ziel-Anime aus der Suche auswaehlen.')
      return
    }

    setIsSaving(true)
    try {
      await createAdminAnimeRelation(
        animeID,
        {
          target_anime_id: selectedTarget.anime_id,
          relation_label: relationLabel,
        },
        authToken,
      )
      await reloadRelations()
      setQuery('')
      setTargets([])
      setSelectedTarget(null)
      onSuccess?.('Relation gespeichert.')
    } catch (error) {
      const message = error instanceof Error && error.message.trim() ? error.message : 'Relation konnte nicht gespeichert werden.'
      setErrorMessage(message)
      onError?.(message)
    } finally {
      setIsSaving(false)
    }
  }

  function startEditing(relation: AdminAnimeRelation) {
    setEditingTargetID(relation.target_anime_id)
    setEditingLabel(relation.relation_label)
    clearMessages()
  }

  function cancelEditing() {
    setEditingTargetID(null)
    setEditingLabel(DEFAULT_LABEL)
    clearMessages()
  }

  async function saveEditing(): Promise<void> {
    if (editingTargetID == null) return

    clearMessages()
    setIsSaving(true)
    try {
      await updateAdminAnimeRelation(
        animeID,
        editingTargetID,
        {
          relation_label: editingLabel,
        },
        authToken,
      )
      await reloadRelations()
      setEditingTargetID(null)
      onSuccess?.('Relation aktualisiert.')
    } catch (error) {
      const message = error instanceof Error && error.message.trim() ? error.message : 'Relation konnte nicht aktualisiert werden.'
      setErrorMessage(message)
      onError?.(message)
    } finally {
      setIsSaving(false)
    }
  }

  async function deleteRelation(targetAnimeID: number): Promise<void> {
    clearMessages()
    setIsSaving(true)
    try {
      await deleteAdminAnimeRelation(animeID, targetAnimeID, authToken)
      await reloadRelations()
      if (editingTargetID === targetAnimeID) {
        setEditingTargetID(null)
      }
      onSuccess?.('Relation geloescht.')
    } catch (error) {
      const message = error instanceof Error && error.message.trim() ? error.message : 'Relation konnte nicht geloescht werden.'
      setErrorMessage(message)
      onError?.(message)
    } finally {
      setIsSaving(false)
    }
  }

  return {
    relations,
    isLoading,
    isSearching,
    isSaving,
    query,
    targets,
    selectedTarget,
    relationLabel,
    editingTargetID,
    editingLabel,
    inlineError,
    errorMessage,
    setQuery: (value) => {
      setQuery(value)
      setSelectedTarget(null)
      setInlineError(null)
      if (!value.trim()) {
        setTargets([])
      }
    },
    selectTarget: (target) => {
      setSelectedTarget(target)
      setQuery(target.title)
      setTargets([])
      setInlineError(null)
    },
    setRelationLabel,
    createRelation,
    startEditing,
    cancelEditing,
    setEditingLabel,
    saveEditing,
    deleteRelation,
    clearMessages,
  }
}
