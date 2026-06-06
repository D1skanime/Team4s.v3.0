'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'

import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  SectionHeader,
  Toolbar,
  Textarea,
} from '@/components/ui'
import { ApiError, confirmProposal, listGroupProposals, rejectProposal } from '@/lib/api'
import type { GroupProposalRow } from '@/types/contributions'
import type { FansubGroupCapabilities } from '@/types/fansub'

import styles from './ContributionsReviewSection.module.css'

interface ContributionsReviewSectionProps {
  fansubId: number
  capabilities: FansubGroupCapabilities
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

type ProposalWithStatus = GroupProposalRow & { status?: string }

export function ContributionsReviewSection({ fansubId, capabilities }: ContributionsReviewSectionProps) {
  if (!capabilities.can_manage_members) return null

  return <ContributionsReviewSectionInner fansubId={fansubId} />
}

function ContributionsReviewSectionInner({ fansubId }: { fansubId: number }) {
  const [proposals, setProposals] = useState<ProposalWithStatus[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<number | null>(null)
  const [rejectNote, setRejectNote] = useState('')
  const [cardErrors, setCardErrors] = useState<Record<number, string>>({})
  const [showOnlyOpen, setShowOnlyOpen] = useState(true)

  const loadProposals = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const resp = await listGroupProposals(fansubId, undefined)
      setProposals(resp.data)
    } catch (err) {
      setError(
        readErrorMessage(err, 'Vorschläge konnten nicht geladen werden. Seite neu laden.'),
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
      await confirmProposal(fansubId, id, undefined)
      setProposals((prev) => prev.filter((p) => p.id !== id))
    } catch (err) {
      setCardErrors((prev) => ({
        ...prev,
        [id]: readErrorMessage(err, 'Aktion fehlgeschlagen. Bitte erneut versuchen.'),
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
        [id]: readErrorMessage(err, 'Aktion fehlgeschlagen. Bitte erneut versuchen.'),
      }))
    }
  }

  const isOpen = (p: ProposalWithStatus) =>
    !p.status || p.status === 'proposed' || p.status === 'pending'

  const visibleProposals = showOnlyOpen ? proposals.filter(isOpen) : proposals

  if (isLoading) {
    return <LoadingState title="Wird geladen…" description="Vorschläge werden abgerufen." />
  }

  if (error) {
    return (
      <ErrorState
        title="Fehler"
        description={error}
      />
    )
  }

  const openCount = proposals.filter(isOpen).length

  return (
    <Card variant="section" className={styles.reviewSection}>
      <Toolbar
        leading={
          <SectionHeader
            title={`Offene Vorschläge (${openCount})`}
            description="Mitglieder-eingereichte Contributions prüfen und bestätigen oder ablehnen."
          />
        }
        trailing={
          <Button
            variant={showOnlyOpen ? 'subtle' : 'ghost'}
            size="sm"
            onClick={() => setShowOnlyOpen((prev) => !prev)}
          >
            {showOnlyOpen ? 'Nur offene anzeigen' : 'Alle anzeigen'}
          </Button>
        }
      />

      {visibleProposals.length === 0 ? (
        showOnlyOpen && proposals.length > 0 ? (
          <EmptyState
            title="Alle Vorschläge wurden bearbeitet."
            description="Alle Vorschläge wurden bearbeitet."
          />
        ) : (
          <EmptyState
            title="Keine offenen Vorschläge"
            description="Für diese Gruppe wurden noch keine Contributions vorgeschlagen."
          />
        )
      ) : (
        <div className={styles.cardStack}>
          {visibleProposals.map((row) => {
            const isDone = !isOpen(row)
            return (
              <Card key={row.id} variant="nested">
                <Toolbar
                  leading={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <strong>{row.member_display_name}</strong>
                      {isDone ? (
                        <Badge variant="muted">Erledigt</Badge>
                      ) : (
                        <Badge variant="warning">In Prüfung</Badge>
                      )}
                    </div>
                  }
                />
                <div style={{ padding: '0 var(--space-4) var(--space-2)' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{row.anime_title}</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                    {row.role_codes.map((code) => (
                      <Badge key={code} variant="info">{code}</Badge>
                    ))}
                  </div>
                  {row.note ? (
                    <p
                      style={{
                        margin: '4px 0 0',
                        fontSize: '0.875rem',
                        fontStyle: 'italic',
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {row.note}
                    </p>
                  ) : null}
                  <span style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                    Eingereicht am {formatDate(row.created_at)}
                  </span>
                  {cardErrors[row.id] ? (
                    <p className={styles.inlineError} role="alert">{cardErrors[row.id]}</p>
                  ) : null}
                  {rejectingId === row.id ? (
                    <div className={styles.rejectExpansion}>
                      <Textarea
                        value={rejectNote}
                        onChange={(e) => setRejectNote(e.target.value)}
                        placeholder="Ablehngrund (optional)"
                        rows={3}
                      />
                      <div className={styles.rejectActions}>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => void handleReject(row.id)}
                        >
                          Ablehnung bestätigen
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setRejectingId(null); setRejectNote('') }}
                        >
                          Abbrechen
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
                {!isDone ? (
                  <div className={styles.cardFooterActions}>
                    <Button
                      variant="success"
                      size="sm"
                      leftIcon={<Check size={16} />}
                      onClick={() => void handleConfirm(row.id)}
                    >
                      Vorschlag bestätigen
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      leftIcon={<X size={16} />}
                      onClick={() => {
                        setRejectingId(rejectingId === row.id ? null : row.id)
                        setRejectNote('')
                      }}
                    >
                      Vorschlag ablehnen
                    </Button>
                  </div>
                ) : null}
              </Card>
            )
          })}
        </div>
      )}
    </Card>
  )
}
