'use client'

import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { IconButton, IconButtonLink } from './IconButton'

export interface NavArrowProps {
  direction: 'previous' | 'next'
  label: string
  onClick?: () => void
  /** Rendert einen Link statt eines Buttons (z. B. für "vorheriger/nächster Eintrag"-Navigation
   *  zwischen Seiten). */
  href?: string
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

/**
 * Pfeil-Knopf für Karussell-/Galerie-/Seiten-Navigation: nur Richtung und Symbol sind eigen,
 * Form/Farbe kommen vollständig von `IconButton`. Die große Größe ist für einen Pfeil direkt auf
 * einem Bild gedacht und nutzt dafür automatisch die dunkel-transparente `IconButton`-Variante;
 * klein/mittel nutzen die dezente Variante mit Pfeil-Ton für helle Umgebungen. Ohne `href`
 * rendert NavArrow einen Button (`onClick`), mit `href` einen Link.
 */
export function NavArrow({ direction, label, onClick, href, disabled = false, size = 'md', className }: NavArrowProps) {
  const Icon = direction === 'previous' ? ChevronLeft : ChevronRight
  const icon = <Icon size={size === 'lg' ? 28 : 18} aria-hidden="true" />
  const isOnImage = size === 'lg'

  if (href) {
    return (
      <IconButtonLink
        as={Link}
        href={href}
        icon={icon}
        aria-label={label}
        shape="round"
        variant={isOnImage ? 'onImage' : 'ghost'}
        tone={isOnImage ? 'default' : 'arrow'}
        size={size}
        className={className}
      />
    )
  }

  return (
    <IconButton
      icon={icon}
      aria-label={label}
      shape="round"
      variant={isOnImage ? 'onImage' : 'ghost'}
      tone={isOnImage ? 'default' : 'arrow'}
      size={size}
      disabled={disabled}
      onClick={onClick}
      className={className}
    />
  )
}
