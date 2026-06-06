'use client'

import { useCallback, useEffect, useState } from 'react'

import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  SectionHeader,
  Textarea,
} from '@/components/ui'
import { ApiError, confirmProposal, listGroupProposals, rejectProposal } from '@/lib/api'
import type { GroupProposalRow } from '@/types/contributions'

import styles from './ReviewQueue.module.css'

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
    return <LoadingState title="Wird geladen…" description="Vorschläge werden abgerufen." />
  }

  if (error) {
    return <ErrorState title="Fehler beim Laden" description={error} />
  }

  return (
    <section>
      <SectionHeader
        title={`Offene Vorschläge (${proposals.length})`}
      />

      {proposals.length === 0 ? (
        <EmptyState
          title="Keine offenen Vorschläge"
          description="Für diese Gruppe wurden noch keine Vorschläge eingereicht."
        />
      ) : (
        <div className={styles.cardStack}>
          {proposals.map((row) => (
            <Card key={row.id} variant="nested">
              <div className={styles.cardHeader}>
                <strong>{row.member_display_name}</strong>
                <Badge variant="warning">In Prüfung</Badge>
              </div>
              <div className={styles.cardBody}>
                <span className={styles.animeTitle}>{row.anime_title}</span>
                <div className={styles.roleChips}>
                  {row.role_codes.map((code) => (
                    <Badge key={code} variant="info">{code}</Badge>
                  ))}
                </div>
                {row.note ? (
                  <p className={styles.noteText}>{row.note}</p>
                ) : null}
                <span className={styles.dateText}>
                  Eingereicht am {formatDate(row.created_at)}
                </span>
                {cardErrors[row.id] ? (
                  <div role="alert" className={styles.inlineError}>
                    {cardErrors[row.id]}
                  </div>
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
                        aria-label={`Ablehnung von ${row.member_display_name} bestätigen`}
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
              <div className={styles.cardFooterActions}>
                <Button
                  variant="success"
                  size="sm"
                  onClick={() => void handleConfirm(row.id)}
                  aria-label={`Vorschlag von ${row.member_display_name} bestätigen`}
                >
                  Vorschlag bestätigen
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    setRejectingId(rejectingId === row.id ? null : row.id)
                    setRejectNote('')
                  }}
                  aria-label={`Vorschlag von ${row.member_display_name} ablehnen`}
                >
                  Vorschlag ablehnen
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  )
}
