'use client'

import { useEffect, useId, useState } from 'react'
import type { ReactNode } from 'react'

import { Button } from './Button'
import { Modal } from './Modal'

export interface ConfirmDialogOptions {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'default' | 'danger'
}

export interface UseConfirmDialogResult {
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>
  confirmDialog: ReactNode
}

type PendingState = ConfirmDialogOptions & { resolve: (value: boolean) => void }

export function useConfirmDialog(): UseConfirmDialogResult {
  const [pending, setPending] = useState<PendingState | null>(null)
  const cancelButtonId = useId()

  useEffect(() => {
    if (!pending) return
    const timer = window.setTimeout(() => {
      document.getElementById(cancelButtonId)?.focus()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [pending, cancelButtonId])

  function confirm(options: ConfirmDialogOptions): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      setPending((current) => {
        current?.resolve(false)
        return { ...options, resolve }
      })
    })
  }

  function settle(value: boolean) {
    setPending((current) => {
      current?.resolve(value)
      return null
    })
  }

  const confirmDialog = pending ? (
    <Modal
      open
      onClose={() => settle(false)}
      title={pending.title}
      description={pending.description}
      footer={
        <>
          <Button id={cancelButtonId} variant="secondary" onClick={() => settle(false)}>
            {pending.cancelLabel ?? 'Abbrechen'}
          </Button>
          <Button variant={pending.tone === 'danger' ? 'danger' : 'primary'} onClick={() => settle(true)}>
            {pending.confirmLabel ?? 'Bestätigen'}
          </Button>
        </>
      }
    >
      {null}
    </Modal>
  ) : null

  return { confirm, confirmDialog }
}
