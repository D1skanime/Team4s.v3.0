'use client'

import { useCallback, useEffect, useState } from 'react'

import { ApiError, getMyAnimeContributions, getMyMemberships, selfPublishContribution } from '@/lib/api'
import { useAuthSession } from '@/lib/useAuthSession'
import type { MeAnimeContribution, MembershipEntry } from '@/types/contributions'

import { ProposalForm, type RoleDefinition } from './ProposalForm'

function readErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return fallback
}

const ANIME_CONTRIBUTION_ROLES: RoleDefinition[] = [
  { code: 'translator', label_de: 'Übersetzung' },
  { code: 'editor', label_de: 'Editing' },
  { code: 'timer', label_de: 'Timing' },
  { code: 'typesetter', label_de: 'Typesetting / FX' },
  { code: 'encoder', label_de: 'Encoding' },
  { code: 'raw_provider', label_de: 'Raw-Bereitstellung' },
  { code: 'quality_checker', label_de: 'Qualitätsprüfung' },
  { code: 'project_lead', label_de: 'Projektleitung' },
  { code: 'project_manager', label_de: 'Projektmanagement' },
  { code: 'designer', label_de: 'Design' },
  { code: 'admin', label_de: 'Administration' },
  { code: 'other', label_de: 'Sonstiges' },
]

function StatusBadge({ status }: { status: MeAnimeContribution['status'] }) {
  const variants: Record<string, { bg: string; color: string; label: string }> = {
    proposed: { bg: '#fff3cd', color: '#8a6420', label: 'In Prüfung' },
    confirmed: { bg: '#d1fae5', color: '#246b52', label: 'Bestätigt' },
    disputed: { bg: '#ffe4e8', color: '#7b2941', label: 'Abgelehnt' },
    draft: { bg: '#f3f4f6', color: '#6b7280', label: 'Entwurf' },
    hidden: { bg: '#f3f4f6', color: '#9ca3af', label: 'Versteckt' },
  }
  const v = variants[status] ?? variants.draft
  return (
    <span
      aria-label={`Status: ${v.label}`}
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 12,
        background: v.bg,
        color: v.color,
        fontSize: '12px',
        fontWeight: 700,
      }}
    >
      {v.label}
    </span>
  )
}

export function MyProposalsSection() {
  const { hasAccessToken, hasRefreshToken, isClientInitialized } = useAuthSession()
  const [proposals, setProposals] = useState<MeAnimeContribution[]>([])
  const [ownGroups, setOwnGroups] = useState<MembershipEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [selfPublishConfirming, setSelfPublishConfirming] = useState<number | null>(null)
  const [selfPublishError, setSelfPublishError] = useState<string | null>(null)

  const hasAuthSession = hasAccessToken || hasRefreshToken

  const loadData = useCallback(async () => {
    if (!isClientInitialized) return
    if (!hasAuthSession) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const [contributionsResp, membershipsResp] = await Promise.allSettled([
        getMyAnimeContributions(),
        getMyMemberships(),
      ])

      if (contributionsResp.status === 'fulfilled') {
        const filtered = contributionsResp.value.data.filter((c) =>
          ['proposed', 'confirmed', 'disputed'].includes(c.status),
        )
        setProposals(filtered)
      } else {
        setError(
          readErrorMessage(contributionsResp.reason, 'Vorschläge konnten nicht geladen werden.'),
        )
      }

      if (membershipsResp.status === 'fulfilled') {
        setOwnGroups(membershipsResp.value.data)
      } else {
        // 404 = kein verifizierter Member-Account → leere ownGroups, Button deaktiviert
        setOwnGroups([])
      }
    } finally {
      setIsLoading(false)
    }
  }, [hasAuthSession, isClientInitialized])

  useEffect(() => {
    void loadData()
  }, [loadData])

  async function handleSelfPublish(id: number) {
    setSelfPublishError(null)
    try {
      await selfPublishContribution(id)
      setProposals((prev) => prev.filter((c) => c.id !== id))
      setSelfPublishConfirming(null)
    } catch (err) {
      setSelfPublishError(
        readErrorMessage(err, 'Öffentlich schalten fehlgeschlagen. Bitte versuche es erneut.'),
      )
    }
  }

  function handleFormSuccess() {
    setShowForm(false)
    void loadData()
  }

  const inPruefung = proposals.filter((c) => c.status === 'proposed')
  const bestaetigt = proposals.filter((c) => c.status === 'confirmed')
  const abgelehnt = proposals.filter((c) => c.status === 'disputed')
  const total = proposals.length

  if (!isClientInitialized || isLoading) {
    return (
      <section>
        <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Eigene Vorschläge</h2>
        <p style={{ color: '#888', fontSize: '0.875rem' }}>Wird geladen…</p>
      </section>
    )
  }

  if (error) {
    return (
      <section>
        <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Eigene Vorschläge</h2>
        <div role="alert" style={{ color: '#82122c', fontSize: '0.875rem', background: '#fee2e2', padding: '10px 14px', borderRadius: 6 }}>
          {error}
        </div>
      </section>
    )
  }

  return (
    <>
      {showForm && (
        <ProposalForm
          onSuccess={handleFormSuccess}
          onClose={() => setShowForm(false)}
          ownGroups={ownGroups}
          roleDefinitions={ANIME_CONTRIBUTION_ROLES}
        />
      )}

      <section style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
            Eigene Vorschläge ({total})
          </h2>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            disabled={ownGroups.length === 0}
            title={ownGroups.length === 0 ? 'Kein verifizierter Account verknüpft' : undefined}
            aria-disabled={ownGroups.length === 0}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: 'none',
              background: ownGroups.length === 0 ? '#c8d0de' : '#5f84dd',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 700,
              cursor: ownGroups.length === 0 ? 'not-allowed' : 'pointer',
              opacity: ownGroups.length === 0 ? 0.56 : 1,
            }}
          >
            + Beitrag vorschlagen
          </button>
        </div>

        {selfPublishError && (
          <div role="alert" style={{ color: '#82122c', fontSize: '0.875rem', background: '#fee2e2', padding: '10px 14px', borderRadius: 6 }}>
            {selfPublishError}
          </div>
        )}

        {total === 0 && (
          <div style={{ color: '#6b7280', textAlign: 'center', padding: '32px 0' }}>
            <strong style={{ display: 'block', marginBottom: 6 }}>Noch keine Vorschläge</strong>
            <span style={{ fontSize: '0.875rem' }}>
              Schlage deinen ersten Beitrag für eine Gruppe vor, in der du Mitglied bist.
            </span>
          </div>
        )}

        {/* In Prüfung */}
        {inPruefung.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#3a4560' }}>
              In Prüfung ({inPruefung.length})
            </h3>
            {inPruefung.map((c) => (
              <div
                key={c.id}
                style={{
                  border: '1px solid #e6ebf3',
                  borderRadius: 8,
                  padding: '14px 16px',
                  background: '#fff',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <StatusBadge status={c.status} />
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Anime #{c.anime_id}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {c.role_codes.map((code) => (
                    <span
                      key={code}
                      style={{
                        background: '#e8f0fe',
                        color: '#1a56db',
                        borderRadius: 12,
                        padding: '2px 8px',
                        fontSize: '12px',
                        fontWeight: 700,
                      }}
                    >
                      {code}
                    </span>
                  ))}
                </div>

                {c.can_self_publish && (
                  <div style={{ marginTop: 4 }}>
                    {selfPublishConfirming === c.id ? (
                      <div style={{ background: '#f0f4ff', borderRadius: 6, padding: '10px 14px', fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <span style={{ color: '#3a4c80' }}>
                          Dieser Eintrag wird als unverifizierter historischer Beitrag öffentlich sichtbar.
                        </span>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <button
                            type="button"
                            onClick={() => void handleSelfPublish(c.id)}
                            style={{
                              padding: '6px 14px',
                              borderRadius: 6,
                              border: 'none',
                              background: '#3a4c80',
                              color: '#fff',
                              fontSize: '14px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Jetzt öffentlich schalten
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelfPublishConfirming(null)}
                            style={{ background: 'none', border: 'none', color: '#5f84dd', fontSize: '0.875rem', cursor: 'pointer', textDecoration: 'underline' }}
                          >
                            Abbrechen
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSelfPublishConfirming(c.id)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: 6,
                          border: '1px solid #3a4c80',
                          background: 'transparent',
                          color: '#3a4c80',
                          fontSize: '14px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Historisch öffentlich schalten
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Bestätigt */}
        {bestaetigt.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#3a4560' }}>
              Bestätigt ({bestaetigt.length})
            </h3>
            {bestaetigt.map((c) => (
              <div
                key={c.id}
                style={{
                  border: '1px solid #e6ebf3',
                  borderRadius: 8,
                  padding: '14px 16px',
                  background: '#fff',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <StatusBadge status={c.status} />
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Anime #{c.anime_id}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {c.role_codes.map((code) => (
                    <span
                      key={code}
                      style={{
                        background: '#e8f0fe',
                        color: '#1a56db',
                        borderRadius: 12,
                        padding: '2px 8px',
                        fontSize: '12px',
                        fontWeight: 700,
                      }}
                    >
                      {code}
                    </span>
                  ))}
                </div>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>
                  Dieser Beitrag wurde durch einen Gruppen-Leader bestätigt.
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Abgelehnt */}
        {abgelehnt.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#3a4560' }}>
              Abgelehnt ({abgelehnt.length})
            </h3>
            {abgelehnt.map((c) => (
              <div
                key={c.id}
                style={{
                  border: '1px solid #f0ccd4',
                  borderRadius: 8,
                  padding: '14px 16px',
                  background: '#fff',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <StatusBadge status={c.status} />
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Anime #{c.anime_id}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {c.role_codes.map((code) => (
                    <span
                      key={code}
                      style={{
                        background: '#e8f0fe',
                        color: '#1a56db',
                        borderRadius: 12,
                        padding: '2px 8px',
                        fontSize: '12px',
                        fontWeight: 700,
                      }}
                    >
                      {code}
                    </span>
                  ))}
                </div>
                {c.review_note && (
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280', fontStyle: 'italic' }}>
                    <strong style={{ fontStyle: 'normal', color: '#4b5563' }}>Ablehngrund:</strong>{' '}
                    {c.review_note}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  )
}
