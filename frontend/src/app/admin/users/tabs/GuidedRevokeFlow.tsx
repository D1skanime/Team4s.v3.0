'use client'

import { useEffect, useId, useMemo, useState } from 'react'

import { ActivationStatusIndicator, Button, FormField, Modal, Select, Textarea } from '@/components/ui'
import { ApiError, mutateCapabilityOverride } from '@/lib/api'
import type {
  CapabilityOverrideMutationResult,
  CapabilityOverrideReason,
  EffectiveRightState,
  RoleCapabilityMatrix,
} from '@/types/admin-capability'

/**
 * Guided "Recht entziehen" flow (CAP-08, D-16, D-17, UI-SPEC.md Section E).
 *
 * Honestly explains every granting source BEFORE recommending a scoped deny override, never
 * offers a fake action for a non-deniable capability (D-17: explanation replaces the action,
 * never a disabled button), and reuses the same component for the simpler "Abweichung
 * entfernen" reversion path when a personal deny override already exists (D-16) -- no fourth
 * file, per 138-08-PLAN.md's binding scope note.
 */

type ReasonCategory = 'task_delegation' | 'security_measure' | 'role_gap' | 'other'

const REASON_OPTIONS: { value: ReasonCategory; label: string }[] = [
  { value: 'task_delegation', label: 'Aufgabenübertragung' },
  { value: 'security_measure', label: 'Sicherheitsmaßnahme' },
  { value: 'role_gap', label: 'Rollen-Lücke' },
  { value: 'other', label: 'Sonstiger Grund' },
]

type FlowStep = 'sources' | 'confirm' | 'status'

export interface GuidedRevokeFlowProps {
  open: boolean
  onClose: () => void
  fansubGroupId: number
  fansubGroupName: string
  appUserId: number
  appUserDisplayName: string
  actionCode: string
  actionLabel: string
  state: EffectiveRightState
  /** Bereits geladene Capability-Matrix (kein zusätzlicher Fetch, Pattern aus 138-08-PLAN.md). */
  matrix: RoleCapabilityMatrix | null
  onMutated: (result: CapabilityOverrideMutationResult) => void
}

/**
 * Ob eine Rolle im bekannten, aktiven fansub_group-Rollenkatalog steht (Frontend-Spiegel von
 * permissions.IsKnownFansubGroupRole, gegen die bereits geladene Matrix statt eines neuen
 * Backend-Calls). Alles andere (z. B. eine reine anime_contribution-Rolle wie encoder) kann
 * durch eine persönliche Abweichung dieses Users NICHT entzogen werden (138-RESEARCH.md
 * Pitfall 5) -- ohne Matrix wird konservativ "bekannt" angenommen, um keine falschen
 * Warnungen zu erzeugen.
 */
function isFansubGroupCatalogRole(roleCode: string, matrix: RoleCapabilityMatrix | null): boolean {
  if (!matrix) return true
  return matrix.roles.some(
    (role) =>
      role.role_code === roleCode &&
      role.role_kind !== 'global_app_role' &&
      (role.contexts ?? []).includes('fansub_group'),
  )
}

export function GuidedRevokeFlow({
  open,
  onClose,
  fansubGroupId,
  fansubGroupName,
  appUserId,
  appUserDisplayName,
  actionCode,
  actionLabel,
  state,
  matrix,
  onMutated,
}: GuidedRevokeFlowProps) {
  const reasonCategoryId = useId()
  const reasonTextId = useId()

  const isRemoveMode = state.user_deny === true
  const isNonDeniable = state.non_deniable === true

  const [step, setStep] = useState<FlowStep>(isRemoveMode ? 'confirm' : 'sources')
  const [reasonCategory, setReasonCategory] = useState<ReasonCategory>('task_delegation')
  const [reasonText, setReasonText] = useState('')
  const [isMutating, setIsMutating] = useState(false)
  const [mutationError, setMutationError] = useState<string | null>(null)
  const [mutationResult, setMutationResult] = useState<CapabilityOverrideMutationResult | null>(null)

  useEffect(() => {
    if (!open) return
    setStep(isRemoveMode ? 'confirm' : 'sources')
    setReasonCategory('task_delegation')
    setReasonText('')
    setIsMutating(false)
    setMutationError(null)
    setMutationResult(null)
    // Re-initialisieren, wenn ein anderes (Gruppe, Aktion, Nutzer)-Tripel geöffnet wird.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, actionCode, fansubGroupId, appUserId, isRemoveMode])

  const flaggedSources = useMemo(
    () =>
      state.granting_roles.map((role) => ({
        role,
        contributionRoleOnly: !isFansubGroupCatalogRole(role, matrix),
      })),
    [state.granting_roles, matrix],
  )

  const reasonValid = reasonCategory !== 'other' || reasonText.trim().length > 0

  async function handleConfirm() {
    setIsMutating(true)
    setMutationError(null)
    try {
      const reason: CapabilityOverrideReason =
        reasonCategory === 'other'
          ? { category: 'other', text: reasonText.trim() }
          : { category: reasonCategory, text: reasonText.trim() || null }

      const result = await mutateCapabilityOverride(fansubGroupId, appUserId, {
        group_id: fansubGroupId,
        target_user_id: appUserId,
        action_code: actionCode,
        effect: isRemoveMode ? null : 'deny',
        reason,
      })

      setMutationResult(result)
      onMutated(result)
      setStep('status')
    } catch (err) {
      setMutationError(
        err instanceof ApiError ? err.message : 'Änderung konnte nicht gespeichert werden.',
      )
    } finally {
      setIsMutating(false)
    }
  }

  const title = isRemoveMode
    ? `Abweichung entfernen: ${actionLabel}`
    : `Recht entziehen: ${actionLabel}`

  // D-17: für ein nicht entziehbares Recht ersetzt die Erklärung die gesamte Aktion -- es wird
  // gar kein Bestätigungs-Button gerendert (auch kein deaktivierter), Modal.tsx's Standard-
  // "Schließen"-Footer bleibt die einzige Aktion. Ausnahme (D-16): existiert bereits ein
  // persönlicher user_deny (isRemoveMode), bleibt der Entfernungs-Pfad erreichbar, auch wenn
  // das Recht aktuell über eine nicht überschreibbare Quelle gewährt wird -- das Entfernen der
  // veralteten Abweichung ist eine andere Operation als ein neues Entziehen.
  if (isNonDeniable && !isRemoveMode) {
    return (
      <Modal open={open} onClose={onClose} title={title} size="md">
        <p>
          Dieses Recht kann für {appUserDisplayName} nicht persönlich entzogen werden. Es wird
          direkt durch {state.granting_roles.join(', ') || decisiveSourceFallback(state)} gewährt
          und ist nicht überschreibbar.
        </p>
      </Modal>
    )
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="md"
      footer={
        step === 'sources' ? (
          <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={onClose}>
              Abbrechen
            </Button>
            <Button variant="primary" onClick={() => setStep('confirm')}>
              Weiter
            </Button>
          </div>
        ) : step === 'confirm' ? (
          <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={onClose} disabled={isMutating}>
              Abbrechen
            </Button>
            <Button
              variant={isRemoveMode ? 'primary' : 'danger'}
              onClick={handleConfirm}
              disabled={isMutating || !reasonValid}
            >
              {isMutating
                ? 'Wird verarbeitet …'
                : isRemoveMode
                  ? 'Abweichung entfernen'
                  : 'Recht entziehen'}
            </Button>
          </div>
        ) : (
          <Button variant="secondary" onClick={onClose}>
            Schließen
          </Button>
        )
      }
    >
      {step === 'sources' && (
        <p>
          Dieses Recht wird aktuell gewährt durch:{' '}
          {flaggedSources.length > 0
            ? flaggedSources
                .map(({ role, contributionRoleOnly }) =>
                  contributionRoleOnly
                    ? `${role} (kann durch eine persönliche Abweichung nicht entzogen werden)`
                    : role,
                )
                .join(', ')
            : '–'}
          . Das Entfernen nur einer dieser Rollen würde das Recht nicht vollständig entziehen.
          Empfohlen: Persönliche Abweichung für diesen Benutzer in {fansubGroupName} setzen.
        </p>
      )}

      {step === 'confirm' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {isRemoveMode ? (
            <p>
              Die persönliche Abweichung für {actionLabel} wird entfernt -- danach gilt wieder das
              normale Ergebnis aus Rollen und sonstigen Quellen.
            </p>
          ) : (
            <p>
              Empfohlen: Persönliche Abweichung für diesen Benutzer in {fansubGroupName} setzen.
              Nachher: {actionLabel} nicht mehr erlaubt.
            </p>
          )}

          <FormField label="Grund" htmlFor={reasonCategoryId} required>
            <Select
              id={reasonCategoryId}
              value={reasonCategory}
              onChange={(event) => setReasonCategory(event.target.value as ReasonCategory)}
            >
              {REASON_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </FormField>

          {reasonCategory === 'other' && (
            <FormField label="Begründung" htmlFor={reasonTextId} required>
              <Textarea
                id={reasonTextId}
                value={reasonText}
                onChange={(event) => setReasonText(event.target.value)}
                rows={3}
              />
            </FormField>
          )}

          {mutationError && (
            <p role="alert" style={{ color: 'var(--color-error)' }}>
              {mutationError}
            </p>
          )}
        </div>
      )}

      {step === 'status' && mutationResult && (
        <ActivationStatusIndicator path="override" activationStatus={mutationResult.activation_status} />
      )}
    </Modal>
  )
}

function decisiveSourceFallback(state: EffectiveRightState): string {
  switch (state.decisive_source) {
    case 'platform_admin':
      return 'Plattform-Admin'
    case 'specialized_grant':
      return state.specialized_grants.join(', ') || 'einer spezialisierten Vergabe'
    default:
      return state.decisive_source
  }
}
