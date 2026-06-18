'use client'

import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

export interface GrantCapabilityModalProps {
  open: boolean
  roleLabel: string
  actionLabel: string
  isMutating: boolean
  mutationError: string | null
  onConfirm: () => void
  onClose: () => void
}

export function GrantCapabilityModal({
  open,
  roleLabel,
  actionLabel,
  isMutating,
  mutationError,
  onConfirm,
  onClose,
}: GrantCapabilityModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Capability vergeben"
      footer={
        <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose} disabled={isMutating}>
            Abbrechen
          </Button>
          <Button variant="primary" onClick={onConfirm} disabled={isMutating}>
            {isMutating ? 'Wird verarbeitet …' : 'Capability vergeben'}
          </Button>
        </div>
      }
    >
      {mutationError && (
        <p role="alert" style={{ color: 'var(--color-error)', marginBottom: 'var(--space-3)' }}>
          {mutationError}
        </p>
      )}
      <p>
        Soll die Capability <strong>{actionLabel}</strong> der Rolle{' '}
        <strong>{roleLabel}</strong> vergeben werden?
      </p>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginTop: 'var(--space-2)' }}>
        Die Änderung wird nach dem nächsten Cache-Reload der Rechte-Prüfung wirksam.
      </p>
    </Modal>
  )
}
