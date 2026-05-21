import { forwardRef } from 'react'
import type { InputHTMLAttributes } from 'react'

import { classNames } from './classNames'
import styles from './ui.module.css'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid = false, disabled, ...props },
  ref,
) {
  return (
    <input
      {...props}
      ref={ref}
      disabled={disabled}
      className={classNames(
        styles.control,
        invalid && styles.controlInvalid,
        disabled && styles.controlDisabled,
        className,
      )}
    />
  )
})
