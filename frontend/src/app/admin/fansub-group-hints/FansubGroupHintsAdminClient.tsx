'use client'

// Plattform-Admin-Liste fuer Korrektur-Hinweise an Zielgruppen OHNE aktive Leitung (D-11).
// Ein Korrektur-Hinweis geht normalerweise an den Leader der Zielgruppe (gruppen-gescopte
// Review-Liste); hat die Zielgruppe aktuell niemanden mit der Rolle fansub_lead (aufgeloeste
// oder verwaiste Gruppe), landet der Hinweis stattdessen hier, serverseitig ermittelt ueber
// AdminFansubGroupHintsHandler.ListWithoutActiveLead (backend/internal/handlers/
// admin_fansub_group_hints_handler.go) — kein client-seitiger Filter auf einem ungefilterten
// Feed. Komposition 1:1 von ClaimsClient.tsx uebernommen (Filter -> Table/Mobile-Card ->
// Pagination -> Reject-Modal), mit den Feld-/Label-Abweichungen aus 191-UI-SPEC.md Component
// Contract C3. Zwei fachliche Unterschiede zum Donor, beide ueber das Typsystem/die
// Datenquelle erzwungen, nicht nur durch UI-Konvention: (1) KEIN Aktivierungsschritt —
// "Hinweis bestätigen" setzt nur den Hinweis-Status auf 'acknowledged', erzeugt nie eine
// Mitgliedschaft (D-03), weil confirmAdminFansubGroupHint() ueberhaupt keine
// Mitgliedschafts-Methode aufrufen kann (siehe backend/internal/handlers/
// fansub_group_hints_decide.go). (2) KEIN Claim-Typ-/Benutzer-ID-Filter — jede Zeile ist
// serverseitig bereits auf "Zielgruppe ohne aktive Leitung" eingegrenzt, es gibt nichts zu
// disambiguieren.
import { useCallback, useEffect, useState } from 'react'

import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  FormField,
  Input,
  LoadingState,
  Modal,
  Pagination,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Textarea,
} from '@/components/ui'
import {
  ApiError,
  confirmAdminFansubGroupHint,
  listAdminFansubGroupHints,
  rejectAdminFansubGroupHint,
} from '@/lib/api'
import { formatDateDeOrIso } from '@/lib/formatDate'
import type { FansubGroupHint, FansubGroupHintStatus } from '@/types/fansub-group-hints'

import { useFansubGroupHintsListFilters } from './useFansubGroupHintsListFilters'

export type HintRowAction = 'confirm' | 'reject'

/**
 * Welche Zeilenaktionen fuer einen Hinweis sichtbar sind — ausschliesslich bei status='open'
 * (D-03: es existiert auf dieser Seite kein weiterer Schritt als Bestaetigen/Ablehnen, anders
 * als bei Claims' zusaetzlichem "Als aktives Mitglied uebernehmen"-Zustand).
 */
export function rowActionsForStatus(status: FansubGroupHintStatus): HintRowAction[] {
  return status === 'open' ? ['confirm', 'reject'] : []
}

/** Deutsches Anzeige-Label je Hinweis-Status (Select-Optionen: Alle/Offen/Bestätigt/Abgelehnt). */
export function hintStatusLabel(status: FansubGroupHintStatus): string {
  switch (status) {
    case 'open':
      return 'Offen'
    case 'acknowledged':
      return 'Bestätigt'
    case 'rejected':
      return 'Abgelehnt'
    default:
      return status
  }
}

/** Badge-Variante je Hinweis-Status. */
export function hintStatusVariant(status: FansubGroupHintStatus): 'warning' | 'success' | 'danger' | 'neutral' {
  switch (status) {
    case 'open':
      return 'warning'
    case 'acknowledged':
      return 'success'
    case 'rejected':
      return 'danger'
    default:
      return 'neutral'
  }
}

/**
 * Exakte Request-Body-Form fuer rejectAdminFansubGroupHint()'s optionalen decisionNote-
 * Parameter — eine leere/nur-Leerzeichen-Eingabe wird zu `undefined` normalisiert, damit der
 * API-Client intern explizit `null` sendet (siehe frontend/src/lib/api/fansub-group-hints.ts),
 * statt eines bedeutungslosen Leerstrings.
 */
export function buildRejectPayload(decisionNote: string): string | undefined {
  const trimmed = decisionNote.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

/** Leerzustand-Text je aktivem Status-Filter (191-UI-SPEC.md Component Contract C3). */
export function emptyStateCopy(status?: string): { title: string; description?: string } {
  if (status === 'open') {
    return { title: 'Keine offenen Hinweise an Gruppen ohne Leitung.' }
  }
  return {
    title: 'Keine offenen Hinweise an Gruppen ohne Leitung',
    description:
      'Aktuell liegen keine Korrektur-Hinweise an Zielgruppen ohne aktive Leitung zur Prüfung vor.',
  }
}

/**
 * Gibt zurück, ob der Viewport als "mobil" gilt (< 760 px) — identischer Breakpoint/matchMedia-
 * Ansatz wie ClaimsClient.tsx (bewusste Kopie statt gemeinsamer Hook, gleiche projektweite
 * Konvention). SSR-sicher: Startzustand ist false, bis matchMedia läuft.
 */
function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const media = window.matchMedia('(max-width: 759px)')
    const onChange = () => setIsMobile(media.matches)
    onChange()
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  return isMobile
}

function readErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message
  if (err instanceof Error) return err.message
  return fallback
}

interface OpenReject {
  hint: FansubGroupHint
}

export function FansubGroupHintsAdminClient() {
  const isMobile = useIsMobile()

  const [items, setItems] = useState<FansubGroupHint[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [openReject, setOpenReject] = useState<OpenReject | null>(null)
  const [decisionNote, setDecisionNote] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)

  const { params, handleStatusChange, handleGroupChange, handleDateRangeChange, handlePageChange } =
    useFansubGroupHintsListFilters()

  // Lokaler Zwischenwert fuer den Gruppen-ID-Filter — schreibt erst onBlur in die URL, identisch
  // zum Donor-Muster in ClaimsClient.tsx (claims-group-filter).
  const [groupIdInput, setGroupIdInput] = useState(params.fansub_group_id?.toString() ?? '')

  useEffect(() => {
    setGroupIdInput(params.fansub_group_id?.toString() ?? '')
  }, [params.fansub_group_id])

  const loadHints = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const resp = await listAdminFansubGroupHints(params)
      setItems(resp.data)
      setTotal(resp.meta.total)
    } catch (err) {
      setError(readErrorMessage(err, 'Hinweise konnten nicht geladen werden. Bitte Seite neu laden.'))
    } finally {
      setIsLoading(false)
    }
  }, [params])

  useEffect(() => {
    void loadHints()
  }, [loadHints])

  async function handleConfirm(hintId: number) {
    setActionError(null)
    try {
      await confirmAdminFansubGroupHint(hintId)
      void loadHints()
    } catch (err) {
      setActionError(readErrorMessage(err, 'Aktion fehlgeschlagen. Bitte erneut versuchen.'))
    }
  }

  async function handleRejectConfirm() {
    if (!openReject) return
    setActionError(null)
    try {
      await rejectAdminFansubGroupHint(openReject.hint.id, buildRejectPayload(decisionNote))
      setOpenReject(null)
      setDecisionNote('')
      void loadHints()
    } catch (err) {
      setActionError(readErrorMessage(err, 'Aktion fehlgeschlagen. Bitte erneut versuchen.'))
    }
  }

  function closeRejectModal() {
    setOpenReject(null)
    setDecisionNote('')
  }

  const limit = params.limit ?? 25
  const currentPage = Math.floor((params.offset ?? 0) / limit) + 1
  const totalPages = Math.ceil(total / limit)
  const emptyCopy = emptyStateCopy(params.status)

  return (
    <div>
      <h1>Hinweise ohne Leitung</h1>

      {/* Filter-Bereich (D-11): Status/Zielgruppe/Zeitraum — bewusst kein Claim-Typ- und
          kein Benutzer-ID-Filter, siehe useFansubGroupHintsListFilters.ts und die Doku dort. */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'var(--space-3)',
          alignItems: 'flex-end',
          marginBottom: 'var(--space-4)',
        }}
      >
        <FormField label="Status" htmlFor="fansub-group-hints-status-filter">
          <Select
            id="fansub-group-hints-status-filter"
            aria-label="Status"
            value={params.status ?? ''}
            onChange={(e) => handleStatusChange(e.currentTarget.value)}
          >
            <option value="">Alle</option>
            <option value="open">Offen</option>
            <option value="acknowledged">Bestätigt</option>
            <option value="rejected">Abgelehnt</option>
          </Select>
        </FormField>

        <FormField label="Zielgruppe (ID)" htmlFor="fansub-group-hints-group-filter">
          <Input
            id="fansub-group-hints-group-filter"
            type="number"
            min={1}
            value={groupIdInput}
            onChange={(e) => setGroupIdInput(e.currentTarget.value)}
            onBlur={() => handleGroupChange(groupIdInput)}
          />
        </FormField>

        <FormField label="Von" htmlFor="fansub-group-hints-from-filter">
          <Input
            id="fansub-group-hints-from-filter"
            type="date"
            value={params.from ?? ''}
            onChange={(e) => handleDateRangeChange(e.currentTarget.value, params.to ?? '')}
          />
        </FormField>

        <FormField label="Bis" htmlFor="fansub-group-hints-to-filter">
          <Input
            id="fansub-group-hints-to-filter"
            type="date"
            value={params.to ?? ''}
            onChange={(e) => handleDateRangeChange(params.from ?? '', e.currentTarget.value)}
          />
        </FormField>
      </div>

      {actionError ? (
        <p role="alert" style={{ color: 'var(--color-error)', marginBottom: 'var(--space-3)' }}>
          {actionError}
        </p>
      ) : null}

      {isLoading ? (
        <LoadingState title="Hinweise werden geladen …" description="" />
      ) : error ? (
        <ErrorState title="Fehler beim Laden" description={error} />
      ) : items.length === 0 ? (
        <EmptyState title={emptyCopy.title} description={emptyCopy.description} />
      ) : isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {items.map((hint) => (
            <HintCard
              key={hint.id}
              hint={hint}
              onConfirm={() => void handleConfirm(hint.id)}
              onReject={() => setOpenReject({ hint })}
            />
          ))}
        </div>
      ) : (
        <Table variant="default">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Antragsteller</TableHeaderCell>
              <TableHeaderCell>Zielgruppe</TableHeaderCell>
              <TableHeaderCell>Projekt</TableHeaderCell>
              <TableHeaderCell>Erstellt</TableHeaderCell>
              <TableHeaderCell>Aktion</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((hint) => (
              <TableRow key={hint.id}>
                <TableCell>
                  <Badge variant={hintStatusVariant(hint.status)}>{hintStatusLabel(hint.status)}</Badge>
                </TableCell>
                <TableCell>{hint.sender_display_name}</TableCell>
                <TableCell>{hint.target_fansub_group_name}</TableCell>
                <TableCell>{hint.related_anime_title}</TableCell>
                <TableCell>{formatDateDeOrIso(hint.created_at)}</TableCell>
                <TableCell>
                  <HintActionButtons
                    hint={hint}
                    onConfirm={() => void handleConfirm(hint.id)}
                    onReject={() => setOpenReject({ hint })}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {totalPages > 1 && (
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
      )}

      {openReject ? (
        <Modal
          open
          onClose={closeRejectModal}
          title="Hinweis ablehnen"
          footer={
            <>
              <Button variant="ghost" onClick={closeRejectModal}>
                Abbrechen
              </Button>
              <Button variant="danger" onClick={() => void handleRejectConfirm()}>
                Ablehnung bestätigen
              </Button>
            </>
          }
        >
          <Textarea
            value={decisionNote}
            onChange={(e) => setDecisionNote(e.currentTarget.value)}
            placeholder="Ablehngrund (optional)"
            rows={3}
          />
        </Modal>
      ) : null}
    </div>
  )
}

interface HintActionButtonsProps {
  hint: FansubGroupHint
  onConfirm: () => void
  onReject: () => void
}

/** D-03: nur Bestätigen/Ablehnen fuer offene Hinweise — kein Aktivierungs-Zwischenschritt wie bei Claims. */
function HintActionButtons({ hint, onConfirm, onReject }: HintActionButtonsProps) {
  const actions = rowActionsForStatus(hint.status)
  if (actions.length === 0) return null

  return (
    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
      {actions.includes('confirm') ? (
        <Button variant="primary" onClick={onConfirm}>
          Hinweis bestätigen
        </Button>
      ) : null}
      {actions.includes('reject') ? (
        <Button variant="danger" onClick={onReject}>
          Hinweis ablehnen
        </Button>
      ) : null}
    </div>
  )
}

interface HintCardProps {
  hint: FansubGroupHint
  onConfirm: () => void
  onReject: () => void
}

/** <760px: Zeilen-Collapse der Desktop-Tabelle als kompakte Card, identisches Muster zu ClaimsClient.tsx's ClaimCard. */
function HintCard({ hint, onConfirm, onReject }: HintCardProps) {
  return (
    <Card variant="compact">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--space-2)',
        }}
      >
        <Badge variant={hintStatusVariant(hint.status)}>{hintStatusLabel(hint.status)}</Badge>
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{formatDateDeOrIso(hint.created_at)}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', alignItems: 'flex-start' }}>
        <strong>{hint.sender_display_name}</strong>
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{hint.target_fansub_group_name}</span>
        <span style={{ fontSize: '13px' }}>{hint.related_anime_title}</span>
      </div>
      <div style={{ marginTop: 'var(--space-2)' }}>
        <HintActionButtons hint={hint} onConfirm={onConfirm} onReject={onReject} />
      </div>
    </Card>
  )
}
