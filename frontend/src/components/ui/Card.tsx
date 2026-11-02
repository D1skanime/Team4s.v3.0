import type { CSSProperties, HTMLAttributes, ReactNode } from 'react'

import { classNames } from './classNames'
import { Heading } from './Heading'
import { Text } from './Text'
import styles from './Card.module.css'

type CardVariant =
  | 'default' | 'elevated' | 'interactive' | 'compact' | 'section' | 'flat' | 'nested' | 'nestedFlat'
  // Zweite offizielle Erscheinung derselben Kartenfläche (261102-hlg, Nachtrag D-05): öffentliche,
  // durchscheinende Flächen auf Foto-/Bannerhintergrund statt der hellen Admin-Optik -- keine
  // Ausnahme/Fehler, siehe CLAUDE.md "öffentliche Optik ist eine zweite offizielle Erscheinung".
  | 'glass' | 'glassStrong'

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
}

export function Card({
  variant = 'default',
  title,
  description,
  header,
  footer,
  tintHue,
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
    ? { ...style, '--card-tint-hue': tintHue } as CSSProperties
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
