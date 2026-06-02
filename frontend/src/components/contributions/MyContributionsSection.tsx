'use client'

import { useState } from 'react'

import { confirmAnimeContribution, rejectAnimeContribution } from '@/lib/api'
import type { MeAnimeContribution } from '@/types/contributions'

import { ContributionCard } from './ContributionCard'

interface MyContributionsSectionProps {
  initialContributions: MeAnimeContribution[]
}

function readErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message
  return fallback
}

export function MyContributionsSection({ initialContributions }: MyContributionsSectionProps) {
  const [contributions, setContributions] = useState<MeAnimeContribution[]>(initialContributions)
  const [actionError, setActionError] = useState<string | null>(null)

  const confirmed = contributions.filter((c) => c.status === 'confirmed')
  const pending = contributions.filter((c) => c.status === 'proposed' || c.status === 'draft')

  async function handleConfirm(id: number) {
    setActionError(null)
    try {
      await confirmAnimeContribution(id)
      // Optimistisch: Status auf confirmed setzen und Sichtbarkeit auf true
      setContributions((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, status: 'confirmed' as const, is_public_on_member_profile: true } : c
        )
      )
    } catch (err) {
      setActionError(readErrorMessage(err, 'Bestätigen fehlgeschlagen. Bitte versuche es erneut.'))
    }
  }

  async function handleReject(id: number) {
    setActionError(null)
    try {
      await rejectAnimeContribution(id)
      // Optimistisch: Beitrag aus der Ausstehend-Liste entfernen (bleibt intern erhalten)
      setContributions((prev) => prev.filter((c) => c.id !== id))
    } catch (err) {
      setActionError(readErrorMessage(err, 'Ablehnen fehlgeschlagen. Bitte versuche es erneut.'))
    }
  }

  function handleVisibilityChange(id: number, isPublic: boolean) {
    setContributions((prev) =>
      prev.map((c) => (c.id === id ? { ...c, is_public_on_member_profile: isPublic } : c))
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {actionError && (
        <div
          role="alert"
          style={{
            background: '#fee2e2',
            color: '#b91c1c',
            borderRadius: 6,
            padding: '10px 16px',
            fontSize: '0.9rem',
          }}
        >
          {actionError}
        </div>
      )}

      {/* Sektion 1: Bestätigte Beiträge */}
      <section>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 12 }}>
          Bestätigte Beiträge ({confirmed.length})
        </h2>
        {confirmed.length === 0 ? (
          <p style={{ color: '#666', fontSize: '0.9rem' }}>Noch keine bestätigten Beiträge vorhanden.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {confirmed.map((c) => (
              <ContributionCard
                key={c.id}
                contribution={c}
                mode="confirmed"
                onVisibilityChange={handleVisibilityChange}
              />
            ))}
          </div>
        )}
      </section>

      {/* Sektion 2: Ausstehende Beiträge */}
      <section>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 12 }}>
          Ausstehend — noch nicht bestätigt ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p style={{ color: '#666', fontSize: '0.9rem' }}>Keine ausstehenden Beiträge.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pending.map((c) => (
              <ContributionCard
                key={c.id}
                contribution={c}
                mode="pending"
                onConfirm={handleConfirm}
                onReject={handleReject}
              />
            ))}
          </div>
        )}
      </section>

      {/* Sektion 3: Eigene Vorschläge (MVP leer) */}
      <section>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 12 }}>
          Eigene Vorschläge (0)
        </h2>
        <p style={{ color: '#888', fontSize: '0.9rem' }}>
          Beitrag vorschlagen folgt in Phase 65.
        </p>
      </section>
    </div>
  )
}
