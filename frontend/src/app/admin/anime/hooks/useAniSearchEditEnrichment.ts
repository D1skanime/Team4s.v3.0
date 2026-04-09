import { useCallback, useMemo, useState } from 'react'

import { loadAdminAnimeEditAniSearchEnrichment } from '@/lib/api'
import type {
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
  const relationCount = result.relations_applied + result.relations_skipped_existing

  return {
    anisearchID: result.anisearch_id,
    updatedFieldCount: result.updated_fields.length,
    protectedFieldCount: result.skipped_protected_fields.length,
    relationCount,
    message: `AniSearch geladen. ${result.updated_fields.length} Felder aktualisiert, ${result.skipped_protected_fields.length} geschuetzt, ${relationCount} Relationen uebernommen.`,
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
      onRequest?.(JSON.stringify(payload, null, 2))

      try {
        const response = await loadAdminAnimeEditAniSearchEnrichment(animeID, payload, authToken)
        setResult(response.data)
        onResponse?.(JSON.stringify(response, null, 2))
        return response.data
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
    summary,
    setAniSearchID,
    setProtectedFields,
    toggleProtectedField,
    runEnrichment,
  }
}
