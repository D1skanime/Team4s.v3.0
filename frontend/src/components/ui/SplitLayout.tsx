import type { CSSProperties, ElementType, HTMLAttributes, ReactNode } from 'react'

import { classNames } from './classNames'
import styles from './SplitLayout.module.css'

/** Zweck-Benennung von SplitLayouts Spaltenabstand -- KEINE rohe Space-Skalenstufe mehr, sondern
 *  ein benannter Einsatzzweck, der intern ueber ein eigenes Zweck-Token in
 *  `src/styles/tokens/layout.css` aufgeloest wird (gleiches Muster wie Stacks
 *  `StackGapPurpose`/`GAP_PURPOSE_TOKENS`). Aktuell nur EIN Mitglied, weil es aktuell nur eine
 *  einzige echte Aufrufstelle mit einem tatsaechlichen Abstandsbedarf gibt (der Anime-Kopf, der
 *  Poster- und Info-Karte direkt aneinandersetzt): `'none'` entspricht dem bisherigen,
 *  seitenspezifischen `--split-gap: 0`-Fremd-Override in `AnimeDetailHero.module.css`, das dieser
 *  Prop jetzt ersetzt. */
export type SplitLayoutGapPurpose = 'none'

/** Loest jeden Zweck-Wert auf sein eigenes, in `layout.css` deklariertes Zweck-Token auf -- niemals
 *  direkt auf die rohe `--space-N`-Grundskala (siehe `SplitLayoutGapPurpose`-Dokumentation oben). */
const GAP_PURPOSE_TOKENS: Record<SplitLayoutGapPurpose, string> = {
  none: 'var(--split-layout-gap-none)',
}

export interface SplitLayoutProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  /** Inhalt der ersten (schmalen/festen) Spalte. */
  firstColumn: ReactNode
  /** Inhalt der zweiten, flexiblen Restspalte (minmax(0,1fr)). */
  secondColumn: ReactNode
  /** Breite der ersten Spalte als benannter Zweck -- 'poster' ist die feste
   *  Posterspalten-Breite des Anime-Kopfs, SplitLayout kennt deren Pixelwert selbst ueber ein
   *  eigenes Zweck-Token in `layout.css` (inkl. Breakpoint-Variante unterhalb 1024px); der
   *  Aufrufer muss die zugrunde liegende Breite nicht mehr kennen. 'auto' bleibt ein echtes,
   *  strukturelles CSS-Schluesselwort (keine Groessen-/Zweck-Verwechslung) und wird weiterhin per
   *  Inline-Stil gesetzt. Wird NUR gesetzt, wenn der Aufrufer sie tatsaechlich uebergibt (siehe
   *  Verhaltenskommentar unten). */
  firstColumnWidth?: 'poster' | 'auto'
  /** Spaltenabstand als benannter Zweck (siehe `SplitLayoutGapPurpose`). Wird NUR gesetzt, wenn
   *  der Aufrufer ihn tatsaechlich uebergibt -- ohne Angabe gilt der CSS-Fallback
   *  var(--space-4). */
  gap?: SplitLayoutGapPurpose
  /** Querachsen-Ausrichtung der beiden Spalten (Standard 'start'). */
  align?: 'start' | 'center' | 'stretch'
  /** Zu rendernde Element-Art (Standard 'div'). */
  as?: ElementType
  className?: string
}

/**
 * Feste/automatische erste Spalte + flexible Restspalte, die unterhalb eines festen
 * Container-Query-Haltepunkts (48rem/768px, siehe SplitLayout.module.css) zu einer einzigen
 * gestapelten Spalte zusammenfaellt -- der generische Zwei-Spalten-Grundbaustein dieser Codebasis
 * (z. B. Poster-/Info-Spalte eines Hero-Bausteins, Avatar-/Textspalte einer Release-Zeile). Nutzt
 * bewusst eine Container- statt einer Viewport-Medienabfrage, da Instanzen in Karten
 * unterschiedlicher verfuegbarer Breite verschachtelt werden (siehe ArtworkHero.module.css fuer
 * dasselbe etablierte Muster). Setzt selbst keine Flaeche/Farbe/Rundung (siehe Stack.tsx fuer
 * dieselbe Begruendung). Der Haltepunkt war vormals ueber eine `breakpoint`-Prop ('md'|'lg')
 * waehlbar -- 'lg' hatte zu keinem Zeitpunkt eine echte Aufrufstelle (grep-bestaetigt bei
 * Entfernung), die Prop ist deshalb komplett entfallen statt als Einzelwert-Literal-Typ erhalten
 * zu bleiben.
 */
export function SplitLayout({
  firstColumn,
  secondColumn,
  firstColumnWidth,
  gap,
  align = 'start',
  as: Component = 'div',
  className,
  style,
  ...props
}: SplitLayoutProps) {
  const mergedStyle = {
    ...style,
    '--split-align': align,
    ...(gap !== undefined ? { '--split-gap': GAP_PURPOSE_TOKENS[gap] } : {}),
    // 'poster' setzt bewusst KEINEN Inline-Stil -- die Breite (inkl. Breakpoint-Variante
    // unterhalb 1024px) kommt stattdessen aus der .columnPoster-Modifikatorklasse weiter unten
    // (siehe SplitLayout.module.css). 'auto' ist ein einzelner, breakpoint-unabhaengiger Wert und
    // bleibt deshalb beim bisherigen Inline-Stil-Mechanismus.
    ...(firstColumnWidth === 'auto' ? { '--split-first-col': 'auto' } : {}),
  } as CSSProperties

  return (
    <Component
      {...props}
      style={mergedStyle}
      className={classNames(
        styles.splitLayout,
        firstColumnWidth === 'poster' && styles.columnPoster,
        className,
      )}
    >
      {/* Eigenes Grid-Kind-Element: ein Container darf laut CSS-Spezifikation nicht gleichzeitig
       *  anhand der eigenen @container-Abfrage sein eigenes Layout aendern (siehe Kommentar in
       *  SplitLayout.module.css) -- das `Component`-Element oben bildet nur den benannten
       *  Container, das eigentliche zweispaltige Grid lebt hier als Nachfahre. */}
      <div className={styles.grid}>
        <div className={styles.firstColumn}>{firstColumn}</div>
        <div className={styles.secondColumn}>{secondColumn}</div>
      </div>
    </Component>
  )
}
