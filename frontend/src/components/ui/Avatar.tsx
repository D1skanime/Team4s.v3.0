import type { HTMLAttributes } from 'react'

import { classNames } from './classNames'
import { ResponsiveImage } from './ResponsiveImage'
import { VisuallyHidden } from './VisuallyHidden'
import styles from './Avatar.module.css'

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg'
export type AvatarColorIndex = 1 | 2 | 3 | 4 | 5 | 6
export type AvatarTone = 'neutral' | 'accent'

export interface AvatarProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** Name oder Bezeichnung der Person/Gruppe -- liefert die Initialen-Abkürzung und den
   *  vorlesbaren Namen, auch wenn ein Bild vorhanden ist. */
  label: string
  src?: string | null
  size?: AvatarSize
  /** Wählt eine der sechs vordefinierten Initialen-Farbpaarungen aus. Ohne Angabe nutzt der
   *  Avatar eine neutrale Standardfarbe. Schließt sich mit `tone` gegenseitig aus. */
  colorIndex?: AvatarColorIndex
  /** 'accent' färbt die Initialen in der Akzentfarbe (--accent-deep, wie Heading tone="accent")
   *  statt der Standardfarbe --text-strong -- für Identitätsflächen auf hellem Untergrund (siehe
   *  ArtworkHero). Ohne Angabe ('neutral') bleibt die Standardfarbe erhalten. */
  tone?: AvatarTone
  /** Zeigt statt Bild/Initialen eine Zähler-Beschriftung ("+3"). `label` bleibt der vorlesbare
   *  Name (z. B. "3 weitere"). */
  count?: number
  /** Legt einen dezenten Rand "auf dunkler Fläche" an (exakt derselbe --border-on-media-Ton, den
   *  Divider und Cards Glas-Varianten bereits verwenden) -- für ein rundes Gruppen-/Identitäts-
   *  bild, das direkt auf einem durchscheinenden/dunklen Untergrund sitzt (z. B. eine Fansub-
   *  Gruppen-Zeile) und sich sonst nicht sichtbar vom Hintergrund absetzen würde. Ohne Angabe
   *  bleibt der Avatar randlos wie bisher. */
  bordered?: boolean
}

export function initials(label: string): string {
  return label
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || '?'
}

const SIZE_PX: Record<AvatarSize, number> = { xs: 20, sm: 32, md: 48, lg: 64 }

/**
 * Rundes Bild- oder Initialen-Kürzel für eine Person oder Gruppe, in vier Größenstufen (die
 * kleinste, `xs`, deckt ein rundes Gruppen-/Identitätsbild in Chip-Größe ab, z. B. ein Fansub-
 * Gruppen-Logo). Ohne Bild zeigt der Avatar die Initialen des übergebenen Namens; mit `count`
 * stattdessen eine Zähler-Beschriftung ("+3") für "N weitere".
 */
export function Avatar({ label, src, size = 'md', colorIndex, tone = 'neutral', count, bordered = false, className, ...rest }: AvatarProps) {
  const pixelSize = SIZE_PX[size]
  const accessibleLabel = typeof count === 'number' ? label : undefined

  return (
    <span
      {...rest}
      className={classNames(
        styles.avatar,
        size === 'xs' && styles.avatarXs,
        size === 'sm' && styles.avatarSm,
        size === 'lg' && styles.avatarLg,
        colorIndex && styles[`avatarColor${colorIndex}` as keyof typeof styles],
        tone === 'accent' && styles.avatarToneAccent,
        bordered && styles.avatarBordered,
        className,
      )}
      aria-label={accessibleLabel}
      title={typeof count !== 'number' ? label : undefined}
    >
      {typeof count === 'number' ? (
        <span aria-hidden="true">+{count}</span>
      ) : src ? (
        <ResponsiveImage src={src} alt="" width={pixelSize} height={pixelSize} className={styles.avatarImage} />
      ) : (
        <span aria-hidden="true">{initials(label)}</span>
      )}
      {typeof count !== 'number' ? <VisuallyHidden>{label}</VisuallyHidden> : null}
    </span>
  )
}
