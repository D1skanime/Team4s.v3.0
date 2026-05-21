import { forwardRef } from 'react'
import type { SelectHTMLAttributes } from 'react'

import { classNames } from './classNames'
import styles from './ui.module.css'

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, invalid = false, disabled, children, ...props },
  ref,
) {
  return (
    <select
      {...props}
      ref={ref}
      disabled={disabled}
      className={classNames(
        styles.control,
        styles.selectControl,
        invalid && styles.controlInvalid,
        disabled && styles.controlDisabled,
        className,
      )}
    >
      {children}
    </select>
  )
})
