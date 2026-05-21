import { forwardRef } from 'react'
import type { TextareaHTMLAttributes } from 'react'

import { classNames } from './classNames'
import styles from './ui.module.css'

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
