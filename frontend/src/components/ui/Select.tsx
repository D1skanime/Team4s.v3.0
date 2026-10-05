import { forwardRef } from 'react'
import type { SelectHTMLAttributes } from 'react'

import { classNames } from './classNames'
import ownStyles from './Select.module.css'
import sharedStyles from './ui.module.css'

const styles = new Proxy({} as Record<string, string>, {
  get: (_target, prop: string) => ownStyles[prop as keyof typeof ownStyles] ?? sharedStyles[prop as keyof typeof sharedStyles],
})

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
