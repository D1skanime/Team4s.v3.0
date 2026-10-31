'use client'

import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ElementType, MouseEvent, ReactNode } from 'react'

import { classNames } from './classNames'
import styles from './Button.module.css'
import { Spinner } from './Spinner'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'subtle' | 'danger' | 'success' | 'text' | 'floating'
/** 'hero' (Größe/Gewicht wie Heading size="hero") und 'prose' (1rem, wie Text variant="body")
 *  ergänzen die Steuerelement-Größen sm/md/lg um zwei Textfluss-Größen -- für `variant="text"`,
 *  das Größe/Gewicht sonst vom umgebenden Kontext erbt. */
type ButtonSize = 'sm' | 'md' | 'lg' | 'hero' | 'prose'
/** 'accent' färbt in der Akzentfarbe (--accent-deep, wie Heading tone="accent"), 'strong' in der
 *  Fließtextfarbe (--text-body) mit stärkerem Schriftgewicht -- beide setzen sich zuverlässig
 *  gegen `variant="text"`s eigenes `color`/`font-weight: inherit` durch. */
type ButtonTone = 'default' | 'accent' | 'strong'

type CommonButtonProps = {
  variant?: ButtonVariant
  size?: ButtonSize
  tone?: ButtonTone
  loading?: boolean
  fullWidth?: boolean
  iconOnly?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  className?: string
  disabled?: boolean
  children?: ReactNode
}

type NativeButtonProps = CommonButtonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: undefined
  }

type LinkButtonProps = CommonButtonProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string
    /** Link-Komponente für interne Ziele (z. B. `next/link`s `Link`, für clientseitige
     *  Navigation statt eines vollen Seiten-Neuladens). Standard: natives `<a>`. */
    as?: ElementType
  }

export type ButtonProps = NativeButtonProps | LinkButtonProps

export function Button(props: ButtonProps) {
  const {
    variant = 'primary',
    size = 'md',
    tone = 'default',
    loading = false,
    fullWidth = false,
    iconOnly = false,
    disabled = false,
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
    variant === 'text' && styles.buttonText,
    variant === 'floating' && styles.buttonFloating,
    size === 'sm' && styles.buttonSmall,
    size === 'lg' && styles.buttonLarge,
    size === 'hero' && styles.buttonHero,
    size === 'prose' && styles.buttonProse,
    tone === 'accent' && styles.buttonToneAccent,
    tone === 'strong' && styles.buttonToneStrong,
    fullWidth && styles.buttonBlock,
    iconOnly && styles.buttonIcon,
    disabled || loading ? styles.buttonDisabled : '',
    className,
  )

  const content = (
    <>
      {/* label="" unterdrückt den vorlesbaren Spinner-Text bewusst: der Button-Inhalt selbst
          (z. B. „Lädt...") ist bereits die vorgesehene Statusmeldung für Screenreader; ein
          zusätzlicher Spinner-Text würde den Accessible Name um einen zweiten, redundanten
          Textknoten verlängern und bestehende namensbasierte Lookups brechen. */}
      {loading ? <Spinner size="sm" label="" /> : leftIcon}
      {children}
      {rightIcon}
    </>
  )

  if ('href' in domProps && typeof domProps.href === 'string') {
    const { href, onClick, target, rel, as: Tag = 'a', ...anchorProps } = domProps
    const isDisabled = Boolean(disabled || loading)
    const handleAnchorClick =
      isDisabled || onClick
        ? (event: MouseEvent<HTMLAnchorElement>) => {
            if (isDisabled) {
              event.preventDefault()
              return
            }
            onClick?.(event)
          }
        : undefined

    return (
      <Tag
        {...anchorProps}
        href={isDisabled ? undefined : href}
        target={target}
        rel={rel}
        className={classes}
        aria-disabled={isDisabled}
        onClick={handleAnchorClick}
      >
        {content}
      </Tag>
    )
  }

  const { type = 'button', ...buttonProps } = domProps

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
