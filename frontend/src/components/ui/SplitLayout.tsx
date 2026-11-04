import type { CSSProperties, ElementType, HTMLAttributes, ReactNode } from 'react'

import { classNames } from './classNames'
import styles from './SplitLayout.module.css'

/* Space-Token-Werte identisch zu Stacks SpaceToken -- bewusst als eigener, inline wiederholter
   Literal-Typ statt eines Imports aus './Stack' (siehe Cluster.tsx fuer dieselbe Begruendung:
   catalogTaxonomy.test.ts verbietet jeden Import eines anderen, selbst katalogisierten
   Grundbausteins, unabhaengig davon, ob es sich nur um einen Typ-Import handelt). */
type SpaceToken = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'

export interface SplitLayoutProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  /** Inhalt der ersten (schmalen/festen) Spalte. */
  firstColumn: ReactNode
  /** Inhalt der zweiten, flexiblen Restspalte (minmax(0,1fr)). */
  secondColumn: ReactNode
  /** Breite der ersten Spalte als beliebiger gueltiger CSS-<length>-Wert oder 'auto' -- der
   *  Aufrufer liefert den Wert, SplitLayout selbst kennt keine Domaenen-Token-Namen. Wird NUR
   *  gesetzt, wenn der Aufrufer sie tatsaechlich uebergibt (siehe Verhaltenskommentar unten). */
  firstColumnWidth?: string
  /** Spaltenabstand als Space-Token. Wird NUR gesetzt, wenn der Aufrufer ihn tatsaechlich
   *  uebergibt -- ohne Angabe gilt der CSS-Fallback var(--space-4). Diese bewusste Abweichung
   *  vom Stack/Cluster-Muster (dort IMMER mit JS-Default inline gesetzt) erlaubt einem
   *  Aufrufer mit mehrstufigem/responsivem Abstandsbedarf (z. B. gap: 0 auf einer Seite mit
   *  eigenem 2-stufigem Breakpoint), stattdessen dieselbe private Variable --split-gap ueber die
   *  eigene className per Medienabfrage zu setzen, statt von einem festen JS-Wert ueberschrieben
   *  zu werden. */
  gap?: SpaceToken
  /** Container-Query-Haltepunkt, ab dem die zweite Spalte neben (statt unter) der ersten
   *  erscheint. 'md' = 48rem/768px (Standard, entspricht ArtworkHeros bestehendem Haltepunkt),
   *  'lg' = 64rem/1024px. */
  breakpoint?: 'md' | 'lg'
  /** Querachsen-Ausrichtung der beiden Spalten (Standard 'start'). */
  align?: 'start' | 'center' | 'stretch'
  /** Zu rendernde Element-Art (Standard 'div'). */
  as?: ElementType
  className?: string
}

/**
 * Feste/automatische erste Spalte + flexible Restspalte, die unterhalb eines konfigurierbaren
 * Container-Query-Haltepunkts zu einer einzigen gestapelten Spalte zusammenfaellt -- der
 * generische Zwei-Spalten-Grundbaustein dieser Codebasis (z. B. Poster-/Info-Spalte eines Hero-
 * Bausteins, Avatar-/Textspalte einer Release-Zeile). Nutzt bewusst eine Container- statt einer
 * Viewport-Medienabfrage, da Instanzen in Karten unterschiedlicher verfuegbarer Breite
 * verschachtelt werden (siehe ArtworkHero.module.css fuer dasselbe etablierte Muster). Setzt
 * selbst keine Flaeche/Farbe/Rundung (siehe Stack.tsx fuer dieselbe Begruendung).
 */
export function SplitLayout({
  firstColumn,
  secondColumn,
  firstColumnWidth,
  gap,
  breakpoint = 'md',
  align = 'start',
  as: Component = 'div',
  className,
  style,
  ...props
}: SplitLayoutProps) {
  const mergedStyle = {
    ...style,
    '--split-align': align,
    ...(gap !== undefined ? { '--split-gap': `var(--space-${gap})` } : {}),
    ...(firstColumnWidth !== undefined ? { '--split-first-col': firstColumnWidth } : {}),
  } as CSSProperties

  return (
    <Component
      {...props}
      style={mergedStyle}
      className={classNames(styles.splitLayout, breakpoint === 'lg' && styles.breakpointLg, className)}
    >
      <div className={styles.firstColumn}>{firstColumn}</div>
      <div className={styles.secondColumn}>{secondColumn}</div>
    </Component>
  )
}
