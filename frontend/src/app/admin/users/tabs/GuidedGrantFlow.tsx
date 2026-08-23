'use client'

import { useEffect, useId, useState } from 'react'

import { ActivationStatusIndicator, Button, FormField, Modal, Select, Textarea } from '@/components/ui'
import { ApiError, mutateCapabilityOverride } from '@/lib/api'
import type {
  CapabilityOverrideMutationResult,
  CapabilityOverrideReason,
  EffectiveRightState,
} from '@/types/admin-capability'

/**
 * Guided "Recht zusätzlich erlauben" flow (CAP-08, D-16 symmetric case, UI-SPEC.md Section E).
 *
 * The grant-side narrative is asymmetric to GuidedRevokeFlow.tsx: there is no "would this fully
 * work" ambiguity to explain (granting an allow override always fully grants, per precedence --
 * user_allow beats role_grant/specialized_grant/no_grant), so this flow has no source-explanation
 * step and no non-deniable case. It reuses the same simplified "Abweichung entfernen" reversion
 * path as GuidedRevokeFlow.tsx when a personal allow override already exists (D-16).
 */

type ReasonCategory = 'task_delegation' | 'security_measure' | 'role_gap' | 'other'

const REASON_OPTIONS: { value: ReasonCategory; label: string }[] = [
  { value: 'task_delegation', label: 'Aufgabenübertragung' },
  { value: 'security_measure', label: 'Sicherheitsmaßnahme' },
  { value: 'role_gap', label: 'Rollen-Lücke' },
  { value: 'other', label: 'Sonstiger Grund' },
]

type FlowStep = 'confirm' | 'status'

export interface GuidedGrantFlowProps {
  open: boolean
  onClose: () => void
  fansubGroupId: number
  appUserId: number
  actionCode: string
  actionLabel: string
  state: EffectiveRightState
  onMutated: (result: CapabilityOverrideMutationResult) => void
}

export function GuidedGrantFlow({
  open,
  onClose,
  fansubGroupId,
  appUserId,
  actionCode,
  actionLabel,
  state,
  onMutated,
}: GuidedGrantFlowProps) {
  const reasonCategoryId = useId()
  const reasonTextId = useId()

  const isRemoveMode = state.user_allow === true

  const [step, setStep] = useState<FlowStep>('confirm')
  const [reasonCategory, setReasonCategory] = useState<ReasonCategory>('task_delegation')
  const [reasonText, setReasonText] = useState('')
  const [isMutating, setIsMutating] = useState(false)
  const [mutationError, setMutationError] = useState<string | null>(null)
  const [mutationResult, setMutationResult] = useState<CapabilityOverrideMutationResult | null>(null)

  useEffect(() => {
    if (!open) return
    setStep('confirm')
    setReasonCategory('task_delegation')
    setReasonText('')
    setIsMutating(false)
    setMutationError(null)
    setMutationResult(null)
  }, [open, actionCode, fansubGroupId, appUserId])

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
        effect: isRemoveMode ? null : 'allow',
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
    : `Recht zusätzlich erlauben: ${actionLabel}`

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="md"
      footer={
        step === 'confirm' ? (
          <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={onClose} disabled={isMutating}>
              Abbrechen
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirm}
              disabled={isMutating || !reasonValid}
            >
              {isMutating
                ? 'Wird verarbeitet …'
                : isRemoveMode
                  ? 'Abweichung entfernen'
                  : 'Recht zusätzlich erlauben'}
            </Button>
          </div>
        ) : (
          <Button variant="secondary" onClick={onClose}>
            Schließen
          </Button>
        )
      }
    >
      {step === 'confirm' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {isRemoveMode ? (
            <p>
              Die persönliche Abweichung für {actionLabel} wird entfernt -- danach gilt wieder das
              normale Ergebnis aus Rollen und sonstigen Quellen.
            </p>
          ) : (
            <p>
              Nachher: {actionLabel} zusätzlich erlaubt -- unabhängig von den vorhandenen Rollen
              dieses Benutzers.
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
