'use client'

import { useEffect, useMemo, useState } from 'react'

import {
  Badge,
  Button,
  LoadingState,
  Modal,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui'
import {
  ApiError,
  activateClaimedMember,
  getClaimActivationImpactPreview as fetchClaimActivationImpactPreview,
  listRoleCapabilities,
  rejectMemberClaim,
  verifyMemberClaim,
} from '@/lib/api'
import type { ActionEntry, ClaimActivationImpactPreview, EffectiveRightState } from '@/types/admin-capability'

/**
 * Phase 138 Plan 14 (D-24): the Claims workspace's per-decision impact panel -- fills the
 * "Aktion" column Plan 138-10 intentionally left empty. This is the ONLY surface where a
 * claim decision gets a rights preview, and ONLY for the one decision that actually changes
 * effective rights (`activate`, backed by the real ActivateClaimedMember mutation). `verify`
 * and `reject` never fabricate a diff (D-24's binding honesty rule): VerifyClaim only flips
 * member_claims.claim_status, RejectClaim only marks the claim rejected -- neither creates or
 * removes a membership/role row, so both render a locked "no rights change" copy with zero
 * preview fetch.
 *
 * The `activate` branch reuses RoleAssignmentImpactModal.tsx's exact gained/lost/unchanged
 * summary + changed-only table rendering approach (Plan 138-09) rather than inventing a third
 * impact-preview rendering convention. Action labels are self-fetched via listRoleCapabilities
 * (mirrors RoleCapabilityImpactPreviewModal.tsx's Plan 138-13 self-fetch precedent), since
 * ClaimsClient.tsx does not already hold a loaded capability matrix the way
 * UserGroupRightsTab.tsx does for RoleAssignmentImpactModal.
 */

export interface ClaimDecisionImpactPanelProps {
  open: boolean
  onClose: () => void
  fansubGroupId: number
  memberId: number
  claimId: number
  appUserDisplayName: string
  decision: 'verify' | 'activate' | 'reject'
  onDecided: () => void
}

interface DiffRow {
  actionCode: string
  label: string
  beforeAllowed: boolean
  afterAllowed: boolean
}

interface DiffSummary {
  rows: DiffRow[]
  gained: number
  lost: number
  unchanged: number
}

/** Rein clientseitige Anzeige-Arithmetik über bereits aufgelöste Daten -- keine neue Präzedenzlogik. */
function computeDiffSummary(
  preview: ClaimActivationImpactPreview,
  actionMeta: Map<string, ActionEntry>,
): DiffSummary {
  const afterByCode = new Map<string, EffectiveRightState>(
    preview.after.map((state) => [state.action_code, state]),
  )
  const rows: DiffRow[] = []
  let gained = 0
  let lost = 0
  let unchanged = 0

  for (const before of preview.before) {
    const after = afterByCode.get(before.action_code)
    const afterAllowed = after ? after.allowed : before.allowed

    if (before.allowed === afterAllowed) {
      unchanged += 1
      continue
    }

    if (afterAllowed) {
      gained += 1
    } else {
      lost += 1
    }

    rows.push({
      actionCode: before.action_code,
      label: actionMeta.get(before.action_code)?.label_de ?? before.action_code,
      beforeAllowed: before.allowed,
      afterAllowed,
    })
  }

  return { rows, gained, lost, unchanged }
}

function allowedLabel(allowed: boolean): string {
  return allowed ? 'Erlaubt' : 'Nicht erlaubt'
}

export function ClaimDecisionImpactPanel({
  open,
  onClose,
  fansubGroupId,
  memberId,
  claimId,
  appUserDisplayName,
  decision,
  onDecided,
}: ClaimDecisionImpactPanelProps) {
  const [isLoading, setIsLoading] = useState(decision === 'activate')
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [preview, setPreview] = useState<ClaimActivationImpactPreview | null>(null)
  const [actionMeta, setActionMeta] = useState<Map<string, ActionEntry>>(new Map())
  const [isMutating, setIsMutating] = useState(false)
  const [mutationError, setMutationError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return

    // D-24: Verifizieren/Ablehnen ändern nachweislich keine effektiven Rechte -- keine
    // Vorschau-Anfrage, kein Ladezustand.
    if (decision !== 'activate') {
      setIsLoading(false)
      setPreviewError(null)
      setPreview(null)
      setMutationError(null)
      return
    }

    let cancelled = false
    setIsLoading(true)
    setPreviewError(null)
    setPreview(null)
    setMutationError(null)

    Promise.all([fetchClaimActivationImpactPreview(fansubGroupId, memberId), listRoleCapabilities()])
      .then(([previewResult, matrix]) => {
        if (cancelled) return
        setPreview(previewResult)
        setActionMeta(new Map(matrix.all_actions.map((action) => [action.code, action])))
      })
      .catch((err) => {
        if (cancelled) return
        setPreviewError(
          err instanceof ApiError ? err.message : 'Serverfehler beim Berechnen der Vorschau.',
        )
      })
      .finally(() => {
        if (cancelled) return
        setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, decision, fansubGroupId, memberId])

  const diff = useMemo(() => {
    if (!preview) return null
    return computeDiffSummary(preview, actionMeta)
  }, [preview, actionMeta])

  async function handleConfirm() {
    setIsMutating(true)
    setMutationError(null)
    try {
      if (decision === 'verify') {
        await verifyMemberClaim(fansubGroupId, claimId)
      } else if (decision === 'reject') {
        await rejectMemberClaim(fansubGroupId, claimId)
      } else {
        await activateClaimedMember(fansubGroupId, memberId)
      }
      onDecided()
      onClose()
    } catch (err) {
      setMutationError(
        err instanceof ApiError ? err.message : 'Entscheidung konnte nicht gespeichert werden.',
      )
    } finally {
      setIsMutating(false)
    }
  }

  const title =
    decision === 'verify'
      ? `Claim bestätigen für ${appUserDisplayName}`
      : decision === 'reject'
        ? `Claim ablehnen für ${appUserDisplayName}`
        : `Als aktives Mitglied übernehmen für ${appUserDisplayName}`

  const confirmLabel = decision === 'verify' ? 'Bestätigen' : decision === 'reject' ? 'Ablehnen' : 'Übernehmen'

  // D-24: für 'activate' keine Mutation ohne erfolgreich berechnete Vorschau -- ein
  // Vorschau-Fehler sperrt "Übernehmen" dauerhaft für diesen Öffnungszyklus. verify/reject
  // haben nie eine Vorschau und werden dadurch nie gesperrt.
  const confirmDisabled =
    decision === 'activate' ? isLoading || Boolean(previewError) || isMutating : isMutating

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="lg"
      footer={
        <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose} disabled={isMutating}>
            Abbrechen
          </Button>
          <Button
            variant={decision === 'reject' ? 'danger' : 'primary'}
            onClick={handleConfirm}
            disabled={confirmDisabled}
          >
            {isMutating ? 'Wird verarbeitet …' : confirmLabel}
          </Button>
        </div>
      }
    >
      {decision === 'verify' && <p>Diese Entscheidung ändert keine effektiven Rechte.</p>}

      {decision === 'reject' && (
        <p>
          Ablehnen: Es entsteht keine neue Zuordnung. {appUserDisplayName} bleibt im aktuellen Zustand.
        </p>
      )}

      {decision === 'activate' && (
        <>
          {isLoading && <LoadingState title="Auswirkungs-Vorschau wird geladen …" description="" />}

          {!isLoading && previewError && (
            <p role="alert" style={{ color: 'var(--color-error)' }}>
              Auswirkungs-Vorschau nicht verfügbar. {previewError}
            </p>
          )}

          {!isLoading && !previewError && preview && diff && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <p>
                {diff.gained} Rechte gewonnen, {diff.lost} Rechte verloren, {diff.unchanged} unverändert.
              </p>

              {diff.rows.length === 0 ? (
                <p>Keine Änderung an den effektiven Rechten.</p>
              ) : (
                <Table variant="compact">
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>Capability</TableHeaderCell>
                      <TableHeaderCell>Vorher</TableHeaderCell>
                      <TableHeaderCell>Nachher</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {diff.rows.map((row) => (
                      <TableRow key={row.actionCode}>
                        <TableCell>{row.label}</TableCell>
                        <TableCell>
                          <Badge variant={row.beforeAllowed ? 'success' : 'muted'}>
                            {allowedLabel(row.beforeAllowed)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={row.afterAllowed ? 'success' : 'muted'}>
                            {allowedLabel(row.afterAllowed)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}
        </>
      )}

      {mutationError && (
        <p role="alert" style={{ color: 'var(--color-error)' }}>
          {mutationError}
        </p>
      )}
    </Modal>
  )
}
