'use client'

import { useCallback, useEffect, useState } from 'react'

import { ApiError, confirmProposal, listGroupProposals, rejectProposal } from '@/lib/api'
import type { GroupProposalRow } from '@/types/contributions'

interface ReviewQueueProps {
  fansubId: number
}

function readErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return fallback
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

export function ReviewQueue({ fansubId }: ReviewQueueProps) {
  const [proposals, setProposals] = useState<GroupProposalRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<number | null>(null)
  const [rejectNote, setRejectNote] = useState('')
  const [cardErrors, setCardErrors] = useState<Record<number, string>>({})

  const loadProposals = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const resp = await listGroupProposals(fansubId)
      setProposals(resp.data)
    } catch (err) {
      setError(
        readErrorMessage(err, 'Die Vorschläge konnten nicht geladen werden. Bitte Seite neu laden.'),
      )
    } finally {
      setIsLoading(false)
    }
  }, [fansubId])

  useEffect(() => {
    void loadProposals()
  }, [loadProposals])

  async function handleConfirm(id: number) {
    setCardErrors((prev) => ({ ...prev, [id]: '' }))
    try {
      await confirmProposal(fansubId, id)
      setProposals((prev) => prev.filter((p) => p.id !== id))
    } catch (err) {
      setCardErrors((prev) => ({
        ...prev,
        [id]: readErrorMessage(err, 'Aktion fehlgeschlagen. Bitte versuche es erneut.'),
      }))
    }
  }

  async function handleReject(id: number) {
    setCardErrors((prev) => ({ ...prev, [id]: '' }))
    try {
      await rejectProposal(fansubId, id, rejectNote || undefined)
      setProposals((prev) => prev.filter((p) => p.id !== id))
      setRejectingId(null)
      setRejectNote('')
    } catch (err) {
      setCardErrors((prev) => ({
        ...prev,
        [id]: readErrorMessage(err, 'Aktion fehlgeschlagen. Bitte versuche es erneut.'),
      }))
    }
  }

  if (isLoading) {
    return (
      <section>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 16px' }}>
          Offene Vorschläge
        </h2>
        <p style={{ color: '#888', fontSize: '0.875rem' }}>Wird geladen…</p>
      </section>
    )
  }

  if (error) {
    return (
      <section>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 16px' }}>
          Offene Vorschläge
        </h2>
        <div
          role="alert"
          style={{
            background: '#fee2e2',
            color: '#82122c',
            borderRadius: 6,
            padding: '10px 14px',
            fontSize: '0.875rem',
          }}
        >
          {error}
        </div>
      </section>
    )
  }

  return (
    <section>
      <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 16px' }}>
        Offene Vorschläge ({proposals.length})
      </h2>

      {proposals.length === 0 ? (
        <div style={{ color: '#6b7280', textAlign: 'center', padding: '32px 0' }}>
          <strong style={{ display: 'block', marginBottom: 6 }}>Keine offenen Vorschläge</strong>
          <span style={{ fontSize: '0.875rem' }}>
            Für diese Gruppe wurden noch keine Vorschläge eingereicht.
          </span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {proposals.map((row) => (
            <div
              key={row.id}
              style={{
                border: '1px solid #e6ebf3',
                borderRadius: 8,
                background: '#fff',
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Zeile 1: Name + Badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: '0.9rem' }}>{row.member_display_name}</strong>
                  <span
                    aria-label="Status: In Prüfung"
                    style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: 12,
                      background: '#fff3cd',
                      color: '#8a6420',
                      fontSize: '12px',
                      fontWeight: 700,
                    }}
                  >
                    In Prüfung
                  </span>
                </div>

                {/* Zeile 2: Anime-Titel + Rollen-Chips */}
                <div>
                  <span style={{ fontSize: '0.875rem', color: '#3a4560', fontWeight: 600 }}>
                    {row.anime_title}
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                    {row.role_codes.map((code) => (
                      <span
                        key={code}
                        style={{
                          background: '#dbeafe',
                          color: '#1e40af',
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
                </div>

                {/* Zeile 3: Notiz */}
                {row.note && (
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.875rem',
                      color: '#6b7280',
                      fontStyle: 'italic',
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {row.note}
                  </p>
                )}

                {/* Zeile 4: Datum */}
                <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                  Eingereicht am {formatDate(row.created_at)}
                </span>

                {/* Kartenfehler */}
                {cardErrors[row.id] && (
                  <div
                    role="alert"
                    style={{
                      background: '#fee2e2',
                      color: '#82122c',
                      borderRadius: 6,
                      padding: '8px 12px',
                      fontSize: '0.8rem',
                    }}
                  >
                    {cardErrors[row.id]}
                  </div>
                )}

                {/* Ablehnen-Expansion */}
                {rejectingId === row.id && (
                  <div
                    style={{
                      background: '#fafafa',
                      borderRadius: 6,
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      border: '1px solid #e6ebf3',
                    }}
                  >
                    <textarea
                      value={rejectNote}
                      onChange={(e) => setRejectNote(e.target.value)}
                      placeholder="Ablehngrund (optional)"
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 6,
                        border: '1px solid #c8d0de',
                        fontSize: '0.875rem',
                        resize: 'vertical',
                        boxSizing: 'border-box',
                      }}
                    />
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={() => void handleReject(row.id)}
                        aria-label={`Ablehnung von ${row.member_display_name} bestätigen`}
                        style={{
                          padding: '6px 14px',
                          borderRadius: 6,
                          border: 'none',
                          background: '#82122c',
                          color: '#fff',
                          fontSize: '14px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Ablehnung bestätigen
                      </button>
                      <button
                        type="button"
                        onClick={() => { setRejectingId(null); setRejectNote('') }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#5f84dd',
                          fontSize: '0.875rem',
                          cursor: 'pointer',
                          textDecoration: 'underline',
                        }}
                      >
                        Abbrechen
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer-Aktionen */}
              <div
                style={{
                  padding: '10px 16px',
                  borderTop: '1px solid #f3f4f6',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 8,
                  background: '#fafafa',
                }}
              >
                <button
                  type="button"
                  onClick={() => void handleConfirm(row.id)}
                  aria-label={`Vorschlag von ${row.member_display_name} bestätigen`}
                  style={{
                    padding: '7px 16px',
                    minHeight: 44,
                    borderRadius: 6,
                    border: 'none',
                    background: 'linear-gradient(135deg, #16a34a, #15803d)',
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Vorschlag bestätigen
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRejectingId(rejectingId === row.id ? null : row.id)
                    setRejectNote('')
                  }}
                  aria-label={`Vorschlag von ${row.member_display_name} ablehnen`}
                  style={{
                    padding: '7px 16px',
                    minHeight: 44,
                    borderRadius: 6,
                    border: 'none',
                    background: 'linear-gradient(135deg, #82122c, #6e0f25)',
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Vorschlag ablehnen
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
