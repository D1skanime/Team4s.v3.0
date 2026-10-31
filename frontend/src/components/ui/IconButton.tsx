import { forwardRef } from 'react'
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ElementType, ReactNode } from 'react'

import { classNames } from './classNames'
import styles from './IconButton.module.css'

export type IconButtonVariant = 'default' | 'ghost' | 'onImage' | 'field' | 'tile' | 'accent'
export type IconButtonSize = 'sm' | 'md' | 'lg' | 'fill'
export type IconButtonShape = 'square' | 'round'
/** 'arrow' färbt in der Pfeil-Akzentfarbe (--ui-arrow). 'muted' dämpft die Textfarbe (--text-muted,
 *  z. B. ein Kalendertag außerhalb des angezeigten Monats). 'line' färbt in der geteilten
 *  Akzentlinienfarbe (--ui-line, z. B. ein Wochenend-Tag oder ein "Leeren"-Auslöser). 'clear'
 *  blendet die Farbe im Ruhezustand dezent ins Feld ein (--field-placeholder-color) und färbt
 *  erst bei Hover deutlich sichtbar (--ui-line) -- für einen Leeren/Entfernen-Auslöser innerhalb
 *  einer Feldzeile. */
export type IconButtonTone = 'default' | 'arrow' | 'muted' | 'line' | 'clear'
export type IconButtonWeight = 'regular' | 'bold'
export type IconButtonMinHeight = 'sm' | 'md'

interface IconButtonVisualProps {
  variant?: IconButtonVariant
  /** 'fill' streckt den Button auf die volle Breite seines Containers mit automatischer Höhe,
   *  statt der festen quadratischen sm/md/lg-Maße -- für ein Auslöser-Feld oder eine Raster-
   *  Auswahlkachel, deren Größe vom umgebenden Layout (Flex-Zeile, Grid-Zelle) bestimmt wird. */
  size?: IconButtonSize
  /** 'square' (Standard, abgerundetes Quadrat) oder 'round' für einen echten Kreis. */
  shape?: IconButtonShape
  tone?: IconButtonTone
  /** Positioniert den Button absolut in der oberen rechten Ecke seines Elterncontainers (z. B.
   *  ein Schließen-Kreuz über einem Bild-Viewer). Unabhängig von `variant`. */
  floating?: boolean
  /** 'bold' erzwingt font-weight 700 unabhängig vom umgebenden Kontext -- z. B. für einen
   *  Feld-Auslöser-Wert (variant="field"), der trotz dessen `font: inherit` immer fett wirken
   *  soll, unabhängig davon, in welche Umgebung der Auslöser eingebettet wird. */
  weight?: IconButtonWeight
  /** Nur bei `size="fill"` relevant: erzwingt eine Mindesthöhe für Raster-Kacheln, deren Höhe
   *  sonst vollständig vom umgebenden Grid-Layout bestimmt würde (z. B. kompaktere Tages- vs.
   *  größere Monats-/Jahres-Kacheln in DatePicker/YearPicker). */
  minHeight?: IconButtonMinHeight
  /** Zeigt eine `variant="tile"`-Kachel auch unausgewählt sichtbar gefüllt (gedämpfter Rahmen/
   *  Hintergrund) statt komplett transparent -- für größere, weniger zahlreiche Kacheln
   *  (Monats-/Jahres-Raster), während kompakte Tages-Kacheln transparent bleiben. */
  tileFill?: boolean
  /** Dämpft eine `variant="tile"`-Kachel optisch (reduzierte Deckkraft) -- z. B. ein Kalendertag
   *  außerhalb des angezeigten Monats. */
  dimmed?: boolean
  /** Hebt eine `variant="tile"`-Kachel per Rahmenfarbe hervor, unabhängig vom "ausgewählt"-
   *  Zustand (aria-current/aria-pressed hat weiterhin Vorrang) -- z. B. die "heute"-Markierung
   *  im Tages-Raster. */
  highlighted?: boolean
  /** Für Elemente in einer sich überlappenden Reihe (negativer Start-Außenabstand plus heller
   *  Trennring, identisches Muster wie Avatar/AvatarStack) -- z. B. AvatarStacks Rest-Zähler-
   *  Button neben überlappenden Avataren. */
  overlap?: boolean
}

function iconButtonClassName(
  {
    variant = 'default',
    size = 'md',
    shape = 'square',
    tone = 'default',
    floating = false,
    weight = 'regular',
    minHeight,
    tileFill = false,
    dimmed = false,
    highlighted = false,
    overlap = false,
  }: IconButtonVisualProps,
  className?: string,
) {
  return classNames(
    styles.iconButton,
    variant === 'ghost' && styles.iconButtonGhost,
    variant === 'onImage' && styles.iconButtonOnImage,
    variant === 'field' && styles.iconButtonField,
    variant === 'tile' && styles.iconButtonTile,
    variant === 'accent' && styles.iconButtonAccent,
    size === 'sm' && styles.iconButtonSm,
    size === 'lg' && styles.iconButtonLg,
    size === 'fill' && styles.iconButtonFill,
    shape === 'round' && styles.iconButtonRound,
    tone === 'arrow' && styles.iconButtonToneArrow,
    tone === 'muted' && styles.iconButtonToneMuted,
    tone === 'line' && styles.iconButtonToneLine,
    tone === 'clear' && styles.iconButtonToneClear,
    floating && styles.iconButtonFloating,
    weight === 'bold' && styles.iconButtonWeightBold,
    minHeight === 'sm' && styles.iconButtonMinHeightSm,
    minHeight === 'md' && styles.iconButtonMinHeightMd,
    tileFill && styles.iconButtonTileFilled,
    dimmed && styles.iconButtonDimmed,
    highlighted && styles.iconButtonHighlighted,
    overlap && styles.iconButtonOverlap,
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
 * `accent` liefert eine gefüllte, akzentfarbene Fläche für einen klickbaren Zähler-/Überlauf-
 * Knopf (z. B. AvatarStacks "+N weitere"). `weight`, `minHeight`, `tileFill`, `dimmed`,
 * `highlighted` und `overlap` ergänzen die field-/tile-/accent-Varianten um die restlichen
 * lokalen Feinheiten, die DatePicker/YearPicker/AvatarStack zuvor per Element+Klasse-Selektor
 * (`button.<klasse>`, höhere Spezifität als eine einzelne Klasse) von außen erzwungen hatten --
 * jetzt echte, typgeprüfte Optionen statt eines CSS-Spezifitäts-Tricks.
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, variant, size, shape, tone, floating, weight, minHeight, tileFill, dimmed, highlighted, overlap, className, type, ...rest },
  ref,
) {
  return (
    <button
      {...rest}
      ref={ref}
      type={type ?? 'button'}
      className={iconButtonClassName({ variant, size, shape, tone, floating, weight, minHeight, tileFill, dimmed, highlighted, overlap }, className)}
    >
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
  { icon, variant, size, shape, tone, floating, weight, minHeight, tileFill, dimmed, highlighted, overlap, className, as: Tag = 'a', ...rest },
  ref,
) {
  return (
    <Tag
      ref={ref}
      className={iconButtonClassName({ variant, size, shape, tone, floating, weight, minHeight, tileFill, dimmed, highlighted, overlap }, className)}
      {...rest}
    >
      {icon}
    </Tag>
  )
})
