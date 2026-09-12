'use client'

import { EmptyState, SectionHeader, Switch } from '@/components/ui'
import type { AdminThemeSegmentContributorCandidate } from '@/types/admin'

interface SegmentContributorsFieldProps {
  candidates: AdminThemeSegmentContributorCandidate[]
  isLoading: boolean
  isSaving: boolean
  error: string | null
  hasOrigin: boolean
  onToggle: (memberId: number, next: boolean) => void
}

/**
 * "Mitwirkende am Segment" -- Mehrfachauswahl der Origin-Contributors fuer ein Segment
 * (Phase 156, Plan 156-14, GAP-01). Der Admin waehlt NUR Personen, niemals deren Rolle --
 * die Rolle kommt live aus dem Origin-Release (156-UAT.md Auftragspunkt 6/7/20). "Keine
 * Auswahl" ist ein gueltiger, eigenstaendig speicherbarer Zustand, kein impliziter
 * "alle anzeigen"-Fallback (156-UAT.md Nachtrag 2026-09-12) -- ein Segment mit null
 * ausgewählten Mitwirkenden ist hier einfach ein Zustand, in dem jeder Switch aus ist.
 * Ausschliesslich @/components/ui-Primitives, keine nativen Formularelemente.
 */
export function SegmentContributorsField({
  candidates,
  isLoading,
  isSaving,
  error,
  hasOrigin,
  onToggle,
}: SegmentContributorsFieldProps) {
  if (!hasOrigin) return null

  return (
    <div>
      <SectionHeader
        level={3}
        title="Mitwirkende am Segment"
        description="Nur Personen der gewählten Origin sind wählbar. Die Rolle stammt aus dem Origin-Release."
      />
      {error ? <p role="alert">{error}</p> : null}
      {isLoading ? (
        <p>Mitwirkende werden geladen...</p>
      ) : candidates.length === 0 ? (
        <EmptyState
          variant="inline"
          title="Keine Mitwirkenden der Origin gefunden"
          description="Die gewählte Origin-Release-Version hat aktuell keine auflösbaren Beitragenden."
        />
      ) : (
        <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
          {candidates.map((candidate) => (
            <Switch
              key={candidate.member_id}
              label={`${candidate.name} — ${candidate.role_label}`}
              checked={candidate.selected}
              onCheckedChange={(next) => onToggle(candidate.member_id, next)}
              disabled={isSaving}
            />
          ))}
        </div>
      )}
    </div>
  )
}
