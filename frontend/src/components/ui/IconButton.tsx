import { forwardRef } from 'react'
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ElementType, ReactNode } from 'react'

import { classNames } from './classNames'
import styles from './IconButton.module.css'

export type IconButtonVariant = 'default' | 'ghost' | 'onImage' | 'field' | 'tile'
export type IconButtonSize = 'sm' | 'md' | 'lg' | 'fill'
export type IconButtonShape = 'square' | 'round'
export type IconButtonTone = 'default' | 'arrow'

interface IconButtonVisualProps {
  variant?: IconButtonVariant
  /** 'fill' streckt den Button auf die volle Breite seines Containers mit automatischer Höhe,
   *  statt der festen quadratischen sm/md/lg-Maße -- für ein Auslöser-Feld oder eine Raster-
   *  Auswahlkachel, deren Größe vom umgebenden Layout (Flex-Zeile, Grid-Zelle) bestimmt wird. */
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
    variant === 'field' && styles.iconButtonField,
    variant === 'tile' && styles.iconButtonTile,
    size === 'sm' && styles.iconButtonSm,
    size === 'lg' && styles.iconButtonLg,
    size === 'fill' && styles.iconButtonFill,
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
 * außen überschreiben. Die Varianten `field` (Auslöser innerhalb einer Feld-Zeile, z. B.
 * DatePicker) und `tile` (Raster-Auswahlkachel mit "ausgewählt"-Zustand über aria-current/
 * aria-pressed, z. B. Tages-/Monats-/Jahres-Kacheln) decken zusammen mit `size="fill"` die
 * Picker-Bausteine ab, ohne dass diese IconButtons Basis-Rezept von außen überschreiben müssen.
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
