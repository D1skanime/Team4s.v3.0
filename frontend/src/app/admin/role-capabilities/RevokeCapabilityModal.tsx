'use client'

import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

export interface RevokeCapabilityModalProps {
  open: boolean
  roleLabel: string
  actionLabel: string
  isMutating: boolean
  mutationError: string | null
  isLockout: boolean
  onConfirm: () => void
  onClose: () => void
}

export function RevokeCapabilityModal({
  open,
  roleLabel,
  actionLabel,
  isMutating,
  mutationError,
  isLockout,
  onConfirm,
  onClose,
}: RevokeCapabilityModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Capability entziehen"
      footer={
        <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose} disabled={isMutating}>
            Abbrechen
          </Button>
          {!isLockout && (
            <Button variant="danger" onClick={onConfirm} disabled={isMutating}>
              {isMutating ? 'Wird verarbeitet …' : 'Capability entziehen'}
            </Button>
          )}
        </div>
      }
    >
      {mutationError && (
        <p role="alert" style={{ color: 'var(--color-error)', marginBottom: 'var(--space-3)' }}>
          {isLockout
            ? 'Diese Capability kann nicht entzogen werden: Sie ist die einzige Rolle mit diesem Recht. Das Entziehen würde alle Benutzer aussperren (Lockout-Schutz).'
            : mutationError}
        </p>
      )}
      {!mutationError && (
        <>
          <p>
            Soll die Capability <strong>{actionLabel}</strong> der Rolle{' '}
            <strong>{roleLabel}</strong> entzogen werden?
          </p>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginTop: 'var(--space-2)' }}>
            Die Änderung wird nach dem nächsten Cache-Reload der Rechte-Prüfung wirksam.
          </p>
        </>
      )}
    </Modal>
  )
}
