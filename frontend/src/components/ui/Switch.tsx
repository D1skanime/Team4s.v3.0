'use client'

import type { ButtonHTMLAttributes } from 'react'

import { classNames } from './classNames'
import styles from './ui.module.css'

export interface SwitchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange' | 'onClick' | 'type'> {
  checked: boolean
  onCheckedChange: (next: boolean) => void
  disabled?: boolean
  label?: string
}

export function Switch({
  checked,
  onCheckedChange,
  disabled = false,
  label,
  className,
  ...rest
}: SwitchProps) {
  function handleClick() {
    if (disabled) return
    onCheckedChange(!checked)
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled || undefined}
      onClick={handleClick}
      className={classNames(
        styles.switchRoot,
        checked && styles.switchChecked,
        disabled && styles.switchDisabled,
        className,
      )}
      {...rest}
    >
      <span className={styles.switchThumb} aria-hidden="true" />
      {label ? <span className={styles.switchLabel}>{label}</span> : null}
    </button>
  )
}
