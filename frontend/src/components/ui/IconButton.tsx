import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { classNames } from './classNames'
import styles from './IconButton.module.css'

export type IconButtonVariant = 'default' | 'floating' | 'ghost'
export type IconButtonSize = 'sm' | 'md' | 'lg'

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: ReactNode
  'aria-label': string
  variant?: IconButtonVariant
  size?: IconButtonSize
}

/**
 * Grundbaustein für Icon-only-Buttons mit erzwungenem `aria-label` (Pflicht-Prop statt optional,
 * damit ein unbeschrifteter Icon-Button gar nicht erst compiliert). Konsolidiert die vormals
 * zufällig fast identischen `.closeButton`/`.closeButtonFloating`-Rezepte aus `ui.module.css`
 * bzw. `Modal.module.css` in EIN Rezept. Eigene, schlanke `forwardRef`-Implementierung (nicht
 * über `Button` komponiert) — `Button` leitet aktuell keinen Ref weiter, Modal/Drawer benötigen
 * aber einen Ref auf den Schließen-Button für ihre bestehende Fokus-beim-Öffnen-Logik.
 *
 * Die Variante `ghost` ist transparent ohne Rahmen/Schatten mit reinem Opazitäts-Hover — Basis
 * für `NavArrow`, das sein eigenes, abweichendes visuelles Rezept (kein Rahmen, kein Hüpf-Effekt)
 * behalten muss, aber trotzdem auf diesem gemeinsamen Baustein aufbauen soll (aria-label-
 * Erzwingung, disabled, Tastatur-Fokus-Ring kommen dadurch von hier statt von einem eigenen
 * nativen `<button>`-Nachbau).
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, variant = 'default', size = 'md', className, type, ...rest },
  ref,
) {
  return (
    <button
      {...rest}
      ref={ref}
      type={type ?? 'button'}
      className={classNames(
        styles.iconButton,
        variant === 'floating' && styles.iconButtonFloating,
        variant === 'ghost' && styles.iconButtonGhost,
        size === 'sm' && styles.iconButtonSm,
        size === 'lg' && styles.iconButtonLg,
        className,
      )}
    >
      {icon}
    </button>
  )
})
