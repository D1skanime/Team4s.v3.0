import { forwardRef } from 'react'
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ElementType, ReactNode } from 'react'

import { classNames } from './classNames'
import styles from './IconButton.module.css'

export type IconButtonVariant = 'default' | 'ghost' | 'onImage'
export type IconButtonSize = 'sm' | 'md' | 'lg'
export type IconButtonShape = 'square' | 'round'
export type IconButtonTone = 'default' | 'arrow'

interface IconButtonVisualProps {
  variant?: IconButtonVariant
  size?: IconButtonSize
  /** 'square' (Standard, abgerundetes Quadrat) oder 'round' für einen echten Kreis. */
  shape?: IconButtonShape
  /** 'arrow' färbt das Icon in der Pfeil-Akzentfarbe (--ui-arrow), z. B. für Navigationspfeile. */
  tone?: IconButtonTone
  /** Positioniert den Button absolut in der oberen rechten Ecke seines Elterncontainers (z. B.
   *  ein Schließen-Kreuz über einem Bild-Viewer). Unabhängig von `variant`. */
  floating?: boolean
}

function iconButtonClassName({ variant = 'default', size = 'md', shape = 'square', tone = 'default', floating = false }: IconButtonVisualProps, className?: string) {
  return classNames(
    styles.iconButton,
    variant === 'ghost' && styles.iconButtonGhost,
    variant === 'onImage' && styles.iconButtonOnImage,
    size === 'sm' && styles.iconButtonSm,
    size === 'lg' && styles.iconButtonLg,
    shape === 'round' && styles.iconButtonRound,
    tone === 'arrow' && styles.iconButtonToneArrow,
    floating && styles.iconButtonFloating,
    className,
  )
}

export interface IconButtonProps extends IconButtonVisualProps, Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: ReactNode
  'aria-label': string
}

/**
 * Grundbaustein für Icon-only-Buttons mit erzwungenem `aria-label` (Pflicht-Prop statt optional,
 * damit ein unbeschrifteter Icon-Button gar nicht erst compiliert). Form (quadratisch/rund),
 * Größe, Farbvariante und Ton sind offizielle Optionen -- kein Baustein muss diese Optik von
 * außen überschreiben.
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, variant, size, shape, tone, floating, className, type, ...rest },
  ref,
) {
  return (
    <button {...rest} ref={ref} type={type ?? 'button'} className={iconButtonClassName({ variant, size, shape, tone, floating }, className)}>
      {icon}
    </button>
  )
})

export interface IconButtonLinkProps extends IconButtonVisualProps, Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'children'> {
  icon: ReactNode
  'aria-label': string
  href: string
  /** Link-Komponente für interne Ziele (z. B. `next/link`s `Link`). Standard: natives `<a>`. */
  as?: ElementType
}

/**
 * Link-Variante von `IconButton` für Icon-only-Navigation zu einem Ziel (z. B. "vorheriger/
 * nächster Eintrag"), mit identischer Optik.
 */
export const IconButtonLink = forwardRef<HTMLAnchorElement, IconButtonLinkProps>(function IconButtonLink(
  { icon, variant, size, shape, tone, floating, className, as: Tag = 'a', ...rest },
  ref,
) {
  return (
    <Tag ref={ref} className={iconButtonClassName({ variant, size, shape, tone, floating }, className)} {...rest}>
      {icon}
    </Tag>
  )
})
