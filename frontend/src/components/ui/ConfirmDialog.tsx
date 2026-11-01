'use client'

import { useRef, useState } from 'react'
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
  // `Button` leitet aktuell keinen Ref an sein inneres <button>-Element weiter (siehe
  // Kommentar in DatePicker.tsx zur gleichen Einschraenkung). Um Modal trotzdem per
  // `initialFocusRef` auf den Abbrechen-Button fokussieren zu koennen, liest ein
  // Callback-Ref am umschliessenden, layoutneutralen Span (display: contents nimmt den
  // Span aus dem Flex-Layout von .dialogFooter heraus) das tatsaechliche <button>-Element aus.
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null)

  function captureCancelButton(node: HTMLSpanElement | null) {
    cancelButtonRef.current = node?.querySelector('button') ?? null
  }

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
      initialFocusRef={cancelButtonRef}
      footer={
        <>
          <span ref={captureCancelButton} style={{ display: 'contents' }}>
            <Button variant="secondary" onClick={() => settle(false)}>
              {pending.cancelLabel ?? 'Abbrechen'}
            </Button>
          </span>
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
