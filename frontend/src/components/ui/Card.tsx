import type { CSSProperties, HTMLAttributes, ReactNode } from 'react'

import { classNames } from './classNames'
import { Heading } from './Heading'
import { Text } from './Text'
import styles from './Card.module.css'

type CardVariant =
  | 'default' | 'elevated' | 'interactive' | 'compact' | 'section' | 'flat' | 'nested' | 'nestedFlat'
  // Zweite offizielle Erscheinung derselben Kartenfläche: öffentliche, durchscheinende Flächen
  // auf Foto-/Bannerhintergrund statt der hellen Admin-Optik -- keine Ausnahme/Fehler, siehe
  // CLAUDE.md "öffentliche Optik ist eine zweite offizielle Erscheinung".
  | 'glass' | 'glassStrong' | 'publicSection' | 'publicHero' | 'publicPoster' | 'publicHeroInfo'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  title?: string
  description?: string
  header?: ReactNode
  footer?: ReactNode
  /** Nur bei variant="glass"/"glassStrong" wirksam: Farbton (0-360) für eine zusätzliche,
   *  generische Tönungsschicht auf der durchscheinenden Fläche. Card kennt bewusst KEINE
   *  Fachnamen (z. B. canon/filler/mixed/recap einer Episodenklassifikation) -- diese Zuordnung
   *  bleibt beim jeweiligen Aufrufer (siehe EpisodeGlassCard.tsx), Card setzt nur die generische
   *  CSS-Variable --card-tint-hue. */
  tintHue?: number
  /** Optionale Feinjustierung der Tönungsformel (Prozentwerte ohne Einheit, z. B. 70 für "70%").
   *  Ohne Angabe gelten Cards generische --card-tint-saturation/-lightness/-surface-alpha/
   *  -border-alpha-Tokens. Ermöglicht einem Aufrufer, eine vorher exakt anders eingestellte
   *  Tönung (z. B. eine der vier Episodenklassifikationen) pixelgenau zu reproduzieren, ohne
   *  dass Card selbst die einzelnen Werte kennen oder Fachnamen führen müsste. */
  tintSaturation?: number
  tintLightness?: number
  tintSurfaceAlpha?: number
  tintBorderAlpha?: number
}

export function Card({
  variant = 'default',
  title,
  description,
  header,
  footer,
  tintHue,
  tintSaturation,
  tintLightness,
  tintSurfaceAlpha,
  tintBorderAlpha,
  className,
  children,
  style,
  ...props
}: CardProps) {
  const cardHeader = header ?? (title || description ? (
    <div>
      {title ? <Heading level={3} size={3} className={styles.cardTitle}>{title}</Heading> : null}
      {description ? <Text variant="meta" className={styles.cardDescription}>{description}</Text> : null}
    </div>
  ) : null)

  const isGlassVariant = variant === 'glass' || variant === 'glassStrong'
  const hasTint = isGlassVariant && tintHue !== undefined
  const mergedStyle: CSSProperties | undefined = hasTint
    ? {
        ...style,
        '--card-tint-hue': tintHue,
        ...(tintSaturation !== undefined ? { '--card-tint-saturation-override': `${tintSaturation}%` } : {}),
        ...(tintLightness !== undefined ? { '--card-tint-lightness-override': `${tintLightness}%` } : {}),
        ...(tintSurfaceAlpha !== undefined ? { '--card-tint-surface-alpha-override': `${tintSurfaceAlpha}%` } : {}),
        ...(tintBorderAlpha !== undefined ? { '--card-tint-border-alpha-override': `${tintBorderAlpha}%` } : {}),
      } as CSSProperties
    : style

  return (
    <section
      {...props}
      style={mergedStyle}
      className={classNames(
        styles.card,
        variant === 'elevated' && styles.cardElevated,
        variant === 'interactive' && styles.cardInteractive,
        variant === 'compact' && styles.cardCompact,
        variant === 'section' && styles.cardSection,
        variant === 'flat' && styles.cardFlat,
        variant === 'nested' && styles.cardNested,
        variant === 'nestedFlat' && styles.cardNestedFlat,
        variant === 'glass' && styles.cardGlass,
        variant === 'glassStrong' && styles.cardGlassStrong,
        variant === 'publicSection' && styles.cardPublicSection,
        variant === 'publicHero' && styles.cardPublicHero,
        variant === 'publicPoster' && styles.cardPublicPoster,
        variant === 'publicHeroInfo' && styles.cardGlass,
        variant === 'publicHeroInfo' && styles.cardPublicHeroInfo,
        hasTint && styles.cardTinted,
        className,
      )}
    >
      {cardHeader ? <div className={styles.cardHeader}>{cardHeader}</div> : null}
      {children}
      {footer ? <div className={styles.cardFooter}>{footer}</div> : null}
    </section>
  )
}
