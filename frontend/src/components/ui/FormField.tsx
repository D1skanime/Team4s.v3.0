import type { ReactNode } from 'react'

import styles from './ui.module.css'

export interface FormFieldProps {
  label?: string
  htmlFor?: string
  hint?: string
  error?: string
  required?: boolean
  disabled?: boolean
  children: ReactNode
}

export function FormField({ label, htmlFor, hint, error, required = false, disabled = false, children }: FormFieldProps) {
  return (
    <div className={styles.fieldset} aria-disabled={disabled}>
      {label ? (
        <div className={styles.fieldLabelRow}>
          <label htmlFor={htmlFor} className={styles.fieldLabel}>
            {label}
          </label>
          {required ? <span className={styles.fieldRequired}>*</span> : null}
        </div>
      ) : null}
      {children}
      {hint ? <p className={styles.fieldHint}>{hint}</p> : null}
      {error ? <p className={styles.fieldError}>{error}</p> : null}
    </div>
  )
}
