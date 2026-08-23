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
import { ApiError, getRoleAssignmentImpactPreview, updateFansubAppMemberRole } from '@/lib/api'
import type { ActionEntry, EffectiveRightState, RoleAssignmentImpactPreview } from '@/types/admin-capability'

/**
 * D-22 (CAP-09's role-assignment sibling, 138-09-PLAN.md): preview-gated modal for assigning or
 * revoking ONE role on ONE group membership -- mirrors GuidedGrantFlow/GuidedRevokeFlow's
 * "never mutate without a computed diff" contract (D-18/D-20), but for a role change instead of
 * a capability-override change.
 *
 * Mutation: reuses the EXISTING, already-live `updateFansubAppMemberRole` (frontend/src/lib/api.ts)
 * rather than adding a new `setFansubGroupMemberRole` function. 138-09-PLAN.md's premise that no
 * frontend consumption function exists for `PUT .../roles` was checked against the real code this
 * session and found incorrect: `updateFansubAppMemberRole(fansubId, appUserId, {role, enabled})`
 * already calls this exact endpoint and is already wired into FansubAppMembersSection.tsx and
 * RoleAssignmentAfterClaim.tsx. Its real backend semantics (confirmed against
 * backend/internal/handlers/app_auth.go's setFansubGroupMemberRole + the repository's SetRole)
 * are additive/removable multi-role -- `enabled:true` adds one role to the member's role set,
 * `enabled:false` removes it -- NOT a "replace with a single active role" model. "Rolle
 * zuweisen"/"Rolle entfernen" therefore map directly onto `enabled: change === 'assign'`. See
 * 138-09-SUMMARY.md's Deviations section for the full rationale (no duplicate fetch function
 * added to api.ts).
 */

export interface RoleAssignmentImpactModalProps {
  open: boolean
  onClose: () => void
  fansubGroupId: number
  fansubGroupName: string
  appUserId: number
  appUserDisplayName: string
  roleCode: string
  roleLabel: string
  change: 'assign' | 'revoke'
  /** Bereits geladene Action-Metadaten (kein zusätzlicher Fetch, Pattern aus 138-08-PLAN.md). */
  actionMeta: Map<string, ActionEntry>
  onMutated: () => void
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
  preview: RoleAssignmentImpactPreview,
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

export function RoleAssignmentImpactModal({
  open,
  onClose,
  fansubGroupId,
  fansubGroupName,
  appUserId,
  appUserDisplayName,
  roleCode,
  roleLabel,
  change,
  actionMeta,
  onMutated,
}: RoleAssignmentImpactModalProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [preview, setPreview] = useState<RoleAssignmentImpactPreview | null>(null)
  const [isMutating, setIsMutating] = useState(false)
  const [mutationError, setMutationError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false

    setIsLoading(true)
    setPreviewError(null)
    setPreview(null)
    setMutationError(null)

    getRoleAssignmentImpactPreview(fansubGroupId, appUserId, roleCode, change)
      .then((result) => {
        if (cancelled) return
        setPreview(result)
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
  }, [open, fansubGroupId, appUserId, roleCode, change])

  const diff = useMemo(() => {
    if (!preview) return null
    return computeDiffSummary(preview, actionMeta)
  }, [preview, actionMeta])

  async function handleConfirm() {
    setIsMutating(true)
    setMutationError(null)
    try {
      await updateFansubAppMemberRole(fansubGroupId, appUserId, {
        role: roleCode,
        enabled: change === 'assign',
      })
      onMutated()
      onClose()
    } catch (err) {
      setMutationError(
        err instanceof ApiError ? err.message : 'Änderung konnte nicht gespeichert werden.',
      )
    } finally {
      setIsMutating(false)
    }
  }

  const title =
    change === 'assign'
      ? `Auswirkungs-Vorschau: Rolle ${roleLabel} zuweisen für ${appUserDisplayName}`
      : `Auswirkungs-Vorschau: Rolle ${roleLabel} entfernen für ${appUserDisplayName}`

  // D-18/D-20: keine Mutation ohne berechnete Vorschau -- ein Vorschau-Fehler sperrt den
  // Bestätigen-Button dauerhaft für diesen Öffnungszyklus.
  const confirmDisabled = isLoading || Boolean(previewError) || isMutating

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
            variant={change === 'assign' ? 'primary' : 'danger'}
            onClick={handleConfirm}
            disabled={confirmDisabled}
          >
            {isMutating
              ? 'Wird verarbeitet …'
              : change === 'assign'
                ? 'Rolle zuweisen'
                : 'Rolle entfernen'}
          </Button>
        </div>
      }
    >
      {isLoading && <LoadingState title="Auswirkungs-Vorschau wird geladen …" description="" />}

      {!isLoading && previewError && (
        <p role="alert" style={{ color: 'var(--color-error)' }}>
          Auswirkungs-Vorschau nicht verfügbar. {previewError}
        </p>
      )}

      {!isLoading && !previewError && preview && diff && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <p>
            In {fansubGroupName}: {diff.gained} Rechte gewonnen, {diff.lost} Rechte verloren,{' '}
            {diff.unchanged} unverändert.
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

          {mutationError && (
            <p role="alert" style={{ color: 'var(--color-error)' }}>
              {mutationError}
            </p>
          )}
        </div>
      )}
    </Modal>
  )
}
