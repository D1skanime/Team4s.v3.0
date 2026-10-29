'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

import { classNames } from './classNames'
import { IconButton } from './IconButton'
import styles from './NavArrow.module.css'

export interface NavArrowProps {
  direction: 'previous' | 'next'
  label: string
  onClick: () => void
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

/**
 * Wine-red Chevron-Pfeil für Karussell-/Galerie-Navigation, aufgebaut auf `IconButton` mit
 * dessen `variant="ghost"` (transparent, Opazitäts-Hover statt Rahmen/Schatten) -- so erbt
 * dieses Primitive weiterhin NICHT die globale `.button:hover { transform: translateY(-1px) }`-
 * Regel, die den von Nutzern gemeldeten Hüpf-Effekt im Vollbild-Viewer verursacht hatte (die
 * frühere Begründung, deshalb ein eigenes natives `<button>` zu bauen, gilt für `IconButton`
 * nicht mehr, da dieses Primitive selbst keinen solchen Hüpf-Effekt besitzt). `aria-label`,
 * `disabled` und der Tastatur-Fokus-Ring kommen jetzt von `IconButton`; NavArrows eigene
 * `.navArrow*`-Klassen überschreiben nur Breite/Höhe/Radius/Farbe für das abweichende
 * NavArrow-Rezept (höhere CSS-Spezifität per Element+Klasse statt reiner Klassen-Selektoren,
 * da sich IconButton und NavArrow in unterschiedlichen CSS-Modulen befinden und deren
 * Bündel-Reihenfolge nicht garantiert ist).
 */
export function NavArrow({ direction, label, onClick, disabled = false, size = 'md', className }: NavArrowProps) {
  const Icon = direction === 'previous' ? ChevronLeft : ChevronRight
  return (
    <IconButton
      variant="ghost"
      size={size}
      icon={<Icon size={size === 'lg' ? 28 : 18} aria-hidden="true" />}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={classNames(
        styles.navArrow,
        size === 'sm' && styles.navArrowSm,
        size === 'lg' && styles.navArrowLg,
        className,
      )}
    />
  )
}
