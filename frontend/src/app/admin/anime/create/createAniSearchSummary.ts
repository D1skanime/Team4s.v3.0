import type { AdminAnimeAniSearchCreateDraftResult } from "@/types/admin";

export interface CreateAniSearchDraftSummary {
  message: string
  notes: string[]
}

function formatFieldList(values: string[] | undefined): string | null {
  const normalized = (values || []).map((value) => value.trim()).filter(Boolean)
  if (normalized.length === 0) return null
  return normalized.join(", ")
}

export function buildCreateAniSearchDraftSummary(params: {
  result: Pick<
    AdminAnimeAniSearchCreateDraftResult,
    "anisearch_id" | "source" | "filled_fields" | "manual_fields_kept" | "provider"
  >
  overwrittenJellyfinFields?: string[]
  preservedManualFields?: string[]
}): CreateAniSearchDraftSummary {
  const updatedFields = formatFieldList(params.result.filled_fields)
  const preservedManualFields = formatFieldList(
    params.preservedManualFields?.length
      ? params.preservedManualFields
      : params.result.manual_fields_kept,
  )
  const overwrittenJellyfinFields = formatFieldList(params.overwrittenJellyfinFields)
  const notes: string[] = []

  if (updatedFields) {
    notes.push(`Aktualisiert: ${updatedFields}.`)
  }

  const relationCandidates = params.result.provider.relation_candidates
  const relationMatches = params.result.provider.relation_matches
  if (relationCandidates > 0) {
    notes.push(
      `Relationen: ${relationMatches} von ${relationCandidates} AniSearch-Relationen konnten lokal zugeordnet werden.`,
    )
  }

  if (overwrittenJellyfinFields) {
    notes.push(`Jellyfin ersetzt: ${overwrittenJellyfinFields}.`)
  }

  if (preservedManualFields) {
    notes.push(`Manuell behalten: ${preservedManualFields}.`)
  }

  notes.push("Noch nichts gespeichert: nothing is saved yet.")

  return {
    message: `AniSearch ID ${params.result.anisearch_id} hat den Entwurf aktualisiert.`,
    notes,
  }
}
