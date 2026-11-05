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

/** Zweck-Benennung von Cards Innenabstands-Override, nach demselben Muster wie Stacks/Clusters
 *  `GAP_PURPOSE_TOKENS` -- Card kennt dabei KEINE rohe Space-Skalenstufe mehr, sondern einen
 *  benannten Einsatzzweck, der intern über ein eigenes Zweck-Token in
 *  `src/styles/tokens/layout.css` auf die unveränderte `--space-N`-Grundskala verweist:
 *  - `'content'`: volle Innenabstand-Polsterung für eine Card-Instanz, deren Variante selbst
 *    kaum/kein Padding mitbringt (z. B. die glassStrong-Vorschaukarte der Randnavigation).
 *  - `'nestedBlock'`: Innenabstand eines verschachtelten Inhaltsblocks innerhalb einer äußeren
 *    Karte (z. B. die Poster-Metadaten-Karte im Anime-Kopf).
 *  - `'dividedSection'`: asymmetrisches Rezept (oben/seitlich/unten) für einen verschachtelten
 *    Inhaltsblock, der durch eine Trennlinie statt durch einen Rahmen vom darüberliegenden
 *    Bereich abgesetzt ist.
 *  - `'none'`: setzt Padding auf den Literalwert `0`. */
export type CardPaddingPurpose = 'content' | 'nestedBlock' | 'dividedSection' | 'none'

/** Löst jeden Zweck-Wert auf sein eigenes, in `layout.css` deklariertes Zweck-Token auf --
 *  niemals direkt auf die rohe `--space-N`-Grundskala (siehe `CardPaddingPurpose`-Dokumentation
 *  oben). `'none'` wird separat als Literal `'0'` behandelt, nicht über diese Tabelle. */
const PADDING_PURPOSE_TOKENS: Record<Exclude<CardPaddingPurpose, 'none'>, string> = {
  content: 'var(--card-padding-content)',
  nestedBlock: 'var(--card-padding-nested-block)',
  dividedSection: 'var(--card-padding-divided-section)',
}

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
  /** Generischer Override-Hook für den Innenabstand EINER Card-Instanz, nach demselben Muster
   *  wie `tintHue`/`--card-radius-override` -- Card kennt dabei einen benannten Einsatzzweck
   *  (siehe `CardPaddingPurpose`), nie eine rohe Space-Skalenstufe. Erlaubt einem
   *  zusammengesetzten Baustein (z. B. einer Info-Karte mit uneinheitlichem Innenabstand), die
   *  Card-eigene Polsterung einer einzelnen Instanz anzufordern, OHNE selbst eine
   *  `padding:`-CSS-Regel zu deklarieren. Ohne Angabe bleibt die bisherige, variantenspezifische
   *  Standard-Polsterung jeder Card-Variante unverändert (Zero-Pixel-Diff für alle bestehenden
   *  Aufrufer). */
  padding?: CardPaddingPurpose
  /** Rand-bis-Rand-Modus: unterhalb von 767px kollabiert Cards eigene horizontale Innenabstand-
   *  Komponente auf 0 (die vertikale bleibt unverändert) UND das Grid-`justify-items` wechselt von
   *  Cards implizitem Standard `stretch` auf `center` -- für einen verschachtelten Inhaltsblock,
   *  der auf schmaler Breite bis an den Rand seines äußeren Containers reichen und seine Kinder
   *  zentrieren soll, statt dessen Innenabstand mitzutragen. Ohne Angabe bleibt jede Variante bei
   *  ihrem bisherigen, nicht-responsiven Polsterungs-/Ausrichtungsverhalten unverändert
   *  (Zero-Pixel-Diff für alle bestehenden Aufrufer). */
  bleedBelowMd?: boolean
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
  padding,
  bleedBelowMd,
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
  const hasPaddingOverride = padding !== undefined
  const paddingOverrideValue = padding !== undefined && padding !== 'none' ? PADDING_PURPOSE_TOKENS[padding] : '0'
  const mergedStyle: CSSProperties | undefined = hasTint || hasPaddingOverride
    ? {
        ...style,
        ...(hasTint
          ? {
              '--card-tint-hue': tintHue,
              ...(tintSaturation !== undefined ? { '--card-tint-saturation-override': `${tintSaturation}%` } : {}),
              ...(tintLightness !== undefined ? { '--card-tint-lightness-override': `${tintLightness}%` } : {}),
              ...(tintSurfaceAlpha !== undefined ? { '--card-tint-surface-alpha-override': `${tintSurfaceAlpha}%` } : {}),
              ...(tintBorderAlpha !== undefined ? { '--card-tint-border-alpha-override': `${tintBorderAlpha}%` } : {}),
            }
          : {}),
        ...(hasPaddingOverride ? { '--card-padding-override': paddingOverrideValue } : {}),
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
        variant === 'publicHeroInfo' && styles.cardPublicHeroInfo,
        hasTint && styles.cardTinted,
        bleedBelowMd && styles.cardBleedBelowMd,
        className,
      )}
    >
      {cardHeader ? <div className={styles.cardHeader}>{cardHeader}</div> : null}
      {children}
      {footer ? <div className={styles.cardFooter}>{footer}</div> : null}
    </section>
  )
}
