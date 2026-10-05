import { forwardRef } from 'react'
import type { TextareaHTMLAttributes } from 'react'

import { classNames } from './classNames'
import ownStyles from './Textarea.module.css'
import sharedStyles from './ui.module.css'

const styles = new Proxy({} as Record<string, string>, {
  get: (_target, prop: string) => ownStyles[prop as keyof typeof ownStyles] ?? sharedStyles[prop as keyof typeof sharedStyles],
})

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, invalid = false, disabled, ...props },
  ref,
) {
  return (
    <textarea
      {...props}
      ref={ref}
      disabled={disabled}
      className={classNames(
        styles.control,
        styles.textarea,
        invalid && styles.controlInvalid,
        disabled && styles.controlDisabled,
        className,
      )}
    />
  )
})
