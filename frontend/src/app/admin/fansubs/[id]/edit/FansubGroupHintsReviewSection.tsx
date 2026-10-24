'use client'

// Leader-Review-Liste fuer eingehende Hinweise an die ZIELGRUPPE (D-01/D-03/D-04(3)).
// Kopie-und-Umbenennung der Komposition aus ContributionsReviewSection.tsx (Card ->
// Toolbar -> EmptyState/ErrorState/LoadingState -> Card-Stack) — eigene Karte statt
// Zusammenfuehrung, weil die Datenquelle eine andere ist (fansub_group_hints statt
// anime_contributions, siehe 191-UI-SPEC.md Component Contract B1). Bestaetigen hier
// erzeugt ausdrueklich KEINE Mitgliedschaft (D-03) — das steht auch wortwoertlich in
// der Beschreibung unterhalb des Abschnittstitels, nicht nur im Backend-Verhalten.
//
// Dateneigenschaft (D-09): jeder Hinweis ist ausnahmslos ein Korrektur-Hinweis mit
// Projektbezug (related_anime_id ist serverseitig Pflicht) — es gibt keine zweite
// Hinweisart und kein strukturiertes Rollenfeld mehr. Die Zielkarte zeigt deshalb fuer
// jede Zeile unconditioned das betroffene Projekt (related_anime_title); eine vom
// Absender frei formulierte Rolle/Begruendung steckt wie gewohnt als Freitext in `note`.
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
import { ApiError, confirmGroupHint, listGroupHints, rejectGroupHint } from '@/lib/api'
import { formatDateDeOrIso } from '@/lib/formatDate'
import type { FansubGroupHint, FansubGroupHintStatus } from '@/types/fansub-group-hints'
import type { FansubGroupCapabilities } from '@/types/fansub-capabilities'

import styles from './ContributionsReviewSection.module.css'

interface FansubGroupHintsReviewSectionProps {
  fansubId: number
  capabilities: FansubGroupCapabilities | null
}

function readErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return fallback
}

/** Ein Hinweis ist offen, solange der Leader noch nicht entschieden hat (D-04(3)). */
export function isOpenHint(status: FansubGroupHintStatus): boolean {
  return status === 'open'
}

export function FansubGroupHintsReviewSection({ fansubId, capabilities }: FansubGroupHintsReviewSectionProps) {
  if (!capabilities?.can_manage_members) return null

  return <FansubGroupHintsReviewSectionInner fansubId={fansubId} />
}

function FansubGroupHintsReviewSectionInner({ fansubId }: { fansubId: number }) {
  const [hints, setHints] = useState<FansubGroupHint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<number | null>(null)
  const [rejectNote, setRejectNote] = useState('')
  const [cardErrors, setCardErrors] = useState<Record<number, string>>({})
  const [showOnlyOpen, setShowOnlyOpen] = useState(true)

  const loadHints = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const resp = await listGroupHints(fansubId)
      setHints(resp.data)
    } catch (err) {
      setError(readErrorMessage(err, 'Hinweise konnten nicht geladen werden. Seite neu laden.'))
    } finally {
      setIsLoading(false)
    }
  }, [fansubId])

  useEffect(() => {
    void loadHints()
  }, [loadHints])

  async function handleConfirm(id: number) {
    setCardErrors((prev) => ({ ...prev, [id]: '' }))
    try {
      await confirmGroupHint(fansubId, id)
      setHints((prev) => prev.filter((h) => h.id !== id))
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
      await rejectGroupHint(fansubId, id, rejectNote || undefined)
      setHints((prev) => prev.filter((h) => h.id !== id))
      setRejectingId(null)
      setRejectNote('')
    } catch (err) {
      setCardErrors((prev) => ({
        ...prev,
        [id]: readErrorMessage(err, 'Aktion fehlgeschlagen. Bitte erneut versuchen.'),
      }))
    }
  }

  const visibleHints = showOnlyOpen ? hints.filter((h) => isOpenHint(h.status)) : hints

  if (isLoading) {
    return <LoadingState title="Wird geladen…" description="Hinweise werden abgerufen." />
  }

  if (error) {
    return <ErrorState title="Fehler" description={error} />
  }

  const openCount = hints.filter((h) => isOpenHint(h.status)).length

  return (
    <Card variant="section" className={styles.reviewSection}>
      <Toolbar
        leading={
          <SectionHeader
            title={`Eingehende Hinweise (${openCount})`}
            description="Hinweise von Mitgliedern anderer Gruppen prüfen — reine Information, keine automatische Mitgliedschaft."
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

      {visibleHints.length === 0 ? (
        showOnlyOpen && hints.length > 0 ? (
          <EmptyState
            title="Alle Hinweise wurden bearbeitet."
            description="Alle Hinweise wurden bearbeitet."
          />
        ) : (
          <EmptyState
            title="Keine offenen Hinweise"
            description="Für diese Gruppe liegen aktuell keine Hinweise von Mitgliedern anderer Gruppen vor."
          />
        )
      ) : (
        <div className={styles.cardStack}>
          {visibleHints.map((hint) => {
            const isDone = !isOpenHint(hint.status)
            return (
              <Card key={hint.id} variant="nested">
                <Toolbar
                  leading={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <strong>{hint.sender_display_name}</strong>
                      {isDone ? (
                        <Badge variant="muted">Erledigt</Badge>
                      ) : (
                        <Badge variant="warning">In Prüfung</Badge>
                      )}
                    </div>
                  }
                />
                <div style={{ padding: '0 var(--space-4) var(--space-2)' }}>
                  {hint.sender_own_group_name ? (
                    <span style={{ fontSize: 14, fontWeight: 400, display: 'block' }}>
                      Mitglied bei: {hint.sender_own_group_name}
                    </span>
                  ) : null}
                  {hint.related_anime_title ? (
                    <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{hint.related_anime_title}</span>
                  ) : null}
                  {/* D-34 (Plan 191-36): Release-Bezug des Hinweises (Plan 191-32), zusaetzlich
                      zum Projekttitel -- keine Zeile, wenn der Hinweis das ganze Projekt meint. */}
                  {hint.related_release_label ? (
                    <span style={{ fontSize: '0.875rem', display: 'block' }}>
                      Release: {hint.related_release_label}
                    </span>
                  ) : null}
                  {hint.note ? (
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
                      {hint.note}
                    </p>
                  ) : null}
                  <span style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                    Eingereicht am {formatDateDeOrIso(hint.created_at)}
                  </span>
                  {cardErrors[hint.id] ? (
                    <p className={styles.inlineError} role="alert">{cardErrors[hint.id]}</p>
                  ) : null}
                  {rejectingId === hint.id ? (
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
                          onClick={() => void handleReject(hint.id)}
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
                      variant="primary"
                      size="sm"
                      leftIcon={<Check size={16} />}
                      onClick={() => void handleConfirm(hint.id)}
                    >
                      Hinweis bestätigen
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      leftIcon={<X size={16} aria-label="Ablehnung abbrechen" />}
                      onClick={() => {
                        setRejectingId(rejectingId === hint.id ? null : hint.id)
                        setRejectNote('')
                      }}
                    >
                      Hinweis ablehnen
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
