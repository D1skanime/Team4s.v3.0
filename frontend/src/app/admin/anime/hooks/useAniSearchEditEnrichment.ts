import { useCallback, useMemo, useState } from 'react'

import { ApiError, loadAdminAnimeEditAniSearchEnrichment } from '@/lib/api'
import type {
  AdminAnimeAniSearchEditConflictResult,
  AdminAnimeAniSearchEditRequest,
  AdminAnimeAniSearchEditResult,
  AdminAnimeEditDraftPayload,
} from '@/types/admin'

export interface BuildAniSearchEditRequestInput {
  anisearchID: string
  draft: AdminAnimeEditDraftPayload
  protectedFields: string[]
}

export interface AniSearchEditResultSummary {
  anisearchID: string
  updatedFieldCount: number
  protectedFieldCount: number
  relationCount: number
  message: string
}

export interface AniSearchEditFeedbackState {
  result: AdminAnimeAniSearchEditResult | null
  conflict: AdminAnimeAniSearchEditConflictResult | null
  errorMessage: string | null
}

export interface UseAniSearchEditEnrichmentParams {
  animeID: number
  authToken?: string
  onRequest?: (value: string | null) => void
  onResponse?: (value: string | null) => void
}

function normalizeProtectedFields(fields: string[]): string[] {
  return [...new Set(fields.map((field) => field.trim()).filter(Boolean))]
}

export function buildAniSearchEditRequest({
  anisearchID,
  draft,
  protectedFields,
}: BuildAniSearchEditRequestInput): AdminAnimeAniSearchEditRequest {
  return {
    anisearch_id: anisearchID.trim(),
    draft,
    protected_fields: normalizeProtectedFields(protectedFields),
  }
}

export function formatAniSearchEditResultSummary(
  result: Pick<
    AdminAnimeAniSearchEditResult,
    'anisearch_id' | 'updated_fields' | 'skipped_protected_fields' | 'relations_applied' | 'relations_skipped_existing'
  >,
): AniSearchEditResultSummary {
  const updatedFields = result.updated_fields ?? []
  const protectedFields = result.skipped_protected_fields ?? []
  const relationCount = result.relations_applied + result.relations_skipped_existing

  return {
    anisearchID: result.anisearch_id,
    updatedFieldCount: updatedFields.length,
    protectedFieldCount: protectedFields.length,
    relationCount,
    message: `AniSearch geladen. ${updatedFields.length} Felder aktualisiert, ${protectedFields.length} geschuetzt, ${relationCount} Relationen uebernommen.`,
  }
}

export function createAniSearchEditSuccessState(result: AdminAnimeAniSearchEditResult): AniSearchEditFeedbackState {
  return {
    result,
    conflict: null,
    errorMessage: null,
  }
}

export function createAniSearchEditFailureState(error: unknown): AniSearchEditFeedbackState {
  if (error instanceof ApiError) {
    return {
      result: null,
      conflict: error.conflict,
      errorMessage: error.message.trim() || 'AniSearch konnte nicht geladen werden.',
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return {
      result: null,
      conflict: null,
      errorMessage: error.message,
    }
  }

  return {
    result: null,
    conflict: null,
    errorMessage: 'AniSearch konnte nicht geladen werden.',
  }
}


export function useAniSearchEditEnrichment({
  animeID,
  authToken,
  onRequest,
  onResponse,
}: UseAniSearchEditEnrichmentParams) {
  const [anisearchID, setAniSearchID] = useState('')
  const [protectedFields, setProtectedFields] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<AdminAnimeAniSearchEditResult | null>(null)
  const [conflict, setConflict] = useState<AdminAnimeAniSearchEditConflictResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const summary = useMemo(() => (result ? formatAniSearchEditResultSummary(result) : null), [result])

  const toggleProtectedField = useCallback((field: string) => {
    setProtectedFields((current) => {
      if (current.includes(field)) {
        return current.filter((entry) => entry !== field)
      }
      return [...current, field]
    })
  }, [])

  const runEnrichment = useCallback(
    async (draft: AdminAnimeEditDraftPayload) => {
      const payload = buildAniSearchEditRequest({
        anisearchID,
        draft,
        protectedFields,
      })

      setIsLoading(true)
      setConflict(null)
      setErrorMessage(null)
      onRequest?.(JSON.stringify(payload, null, 2))

      try {
        const response = await loadAdminAnimeEditAniSearchEnrichment(animeID, payload, authToken)
        const successState = createAniSearchEditSuccessState(response.data)
        setResult(successState.result)
        setConflict(successState.conflict)
        setErrorMessage(successState.errorMessage)
        onResponse?.(JSON.stringify(response, null, 2))
        return response.data
      } catch (error) {
        const failureState = createAniSearchEditFailureState(error)
        setResult(failureState.result)
        setConflict(failureState.conflict)
        setErrorMessage(failureState.errorMessage)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [anisearchID, animeID, authToken, onRequest, onResponse, protectedFields],
  )

  return {
    anisearchID,
    protectedFields,
    isLoading,
    result,
    conflict,
    errorMessage,
    summary,
    setAniSearchID,
    setProtectedFields,
    toggleProtectedField,
    runEnrichment,
  }
}
