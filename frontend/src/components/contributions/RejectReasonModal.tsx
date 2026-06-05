'use client'

import { useState } from 'react'

import { Button, FormField, Modal, Textarea } from '@/components/ui'
import { ApiError } from '@/lib/api'

interface RejectReasonModalProps {
  open: boolean
  contributionId: number | null
  onClose: () => void
  onConfirm: (contributionId: number, reason: string) => Promise<void>
}

export function RejectReasonModal({
  open,
  contributionId,
  onClose,
  onConfirm,
}: RejectReasonModalProps) {
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isValid = reason.trim().length >= 5

  async function handleSubmit() {
    if (!contributionId || !isValid) return
    setIsSubmitting(true)
    setError(null)
    try {
      await onConfirm(contributionId, reason.trim())
      setReason('')
      onClose()
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Der Widerspruch konnte nicht gesendet werden. Bitte versuche es erneut.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleClose() {
    setReason('')
    setError(null)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Zuordnung widersprechen"
      footer={
        <>
          <Button variant="secondary" type="button" onClick={handleClose}>
            Abbrechen
          </Button>
          <Button
            variant="danger"
            type="button"
            disabled={!isValid || isSubmitting}
            onClick={() => void handleSubmit()}
          >
            {isSubmitting ? 'Wird gesendet…' : 'Widerspruch senden'}
          </Button>
        </>
      }
    >
      <FormField
        label="Warum trifft diese Zuordnung nicht zu?"
        htmlFor="reject-reason"
        hint="Die Begründung ist erforderlich und hilft dem Gruppen-Leader, den Widerspruch einzuordnen. Es wird nichts gelöscht."
        required
      >
        <Textarea
          id="reject-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Kurze Begründung…"
          required
        />
      </FormField>
      {error ? (
        <p
          role="alert"
          style={{ color: 'var(--button-danger-start)', fontSize: '0.875rem', marginTop: 8 }}
        >
          {error}
        </p>
      ) : null}
    </Modal>
  )
}
