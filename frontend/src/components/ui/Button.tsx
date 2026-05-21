import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react'

import { classNames } from './classNames'
import styles from './ui.module.css'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'subtle' | 'danger' | 'success'
type ButtonSize = 'sm' | 'md' | 'lg'

type CommonButtonProps = {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  fullWidth?: boolean
  iconOnly?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  className?: string
  children?: ReactNode
}

type NativeButtonProps = CommonButtonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: undefined
  }

type LinkButtonProps = CommonButtonProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string
  }

export type ButtonProps = NativeButtonProps | LinkButtonProps

export function Button(props: ButtonProps) {
  const {
    variant = 'primary',
    size = 'md',
    loading = false,
    fullWidth = false,
    iconOnly = false,
    leftIcon,
    rightIcon,
    className,
    children,
    ...domProps
  } = props

  const classes = classNames(
    styles.button,
    variant === 'primary' && styles.buttonPrimary,
    variant === 'secondary' && styles.buttonSecondary,
    variant === 'ghost' && styles.buttonGhost,
    variant === 'subtle' && styles.buttonSubtle,
    variant === 'danger' && styles.buttonDanger,
    variant === 'success' && styles.buttonSuccess,
    size === 'sm' && styles.buttonSmall,
    size === 'lg' && styles.buttonLarge,
    fullWidth && styles.buttonBlock,
    iconOnly && styles.buttonIcon,
    ('disabled' in props && props.disabled) || loading ? styles.buttonDisabled : '',
    className,
  )

  const content = (
    <>
      {loading ? <span className={styles.buttonSpinner} aria-hidden="true" /> : leftIcon}
      {children}
      {rightIcon}
    </>
  )

  if ('href' in domProps && typeof domProps.href === 'string') {
    const { href, onClick, target, rel, ...anchorProps } = domProps
    const isDisabled = Boolean(('disabled' in props && props.disabled) || loading)

    return (
      <a
        {...anchorProps}
        href={isDisabled ? undefined : href}
        target={target}
        rel={rel}
        className={classes}
        aria-disabled={isDisabled}
        onClick={(event) => {
          if (isDisabled) {
            event.preventDefault()
            return
          }
          onClick?.(event)
        }}
      >
        {content}
      </a>
    )
  }

  const { type = 'button', disabled, ...buttonProps } = domProps

  return (
    <button
      {...buttonProps}
      type={type}
      className={classes}
      disabled={disabled || loading}
    >
      {content}
    </button>
  )
}
