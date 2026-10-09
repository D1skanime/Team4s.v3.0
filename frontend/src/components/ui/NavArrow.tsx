'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

import { classNames } from './classNames'
import styles from './NavArrow.module.css'

export interface NavArrowProps {
  direction: 'previous' | 'next'
  label: string
  onClick: () => void
  disabled?: boolean
  size?: 'default' | 'large'
  className?: string
}

/**
 * Wine-red Chevron-Pfeil, herausgelöst aus der ehemals lokalen CarouselArrow-Funktion
 * (FocalCarouselInternals.tsx) nach components/ui (Phase 177 Gap-Fix, D-26). Rendert bewusst
 * einen nativen <button>, NICHT die Button-Komponente -- so erbt dieses Primitive niemals die
 * globale .button:hover { transform: translateY(-1px) }-Regel, die den von Nutzern gemeldeten
 * Hüpf-Effekt im Vollbild-Viewer verursacht hatte.
 */
export function NavArrow({ direction, label, onClick, disabled = false, size = 'default', className }: NavArrowProps) {
  const Icon = direction === 'previous' ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      className={classNames(styles.navArrow, size === 'large' && styles.navArrowLarge, className)}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon size={size === 'large' ? 28 : 18} aria-hidden="true" />
    </button>
  )
}
