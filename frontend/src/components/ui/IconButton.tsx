import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { classNames } from './classNames'
import styles from './IconButton.module.css'

export type IconButtonVariant = 'default' | 'floating'
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
        size === 'sm' && styles.iconButtonSm,
        size === 'lg' && styles.iconButtonLg,
        className,
      )}
    >
      {icon}
    </button>
  )
})
