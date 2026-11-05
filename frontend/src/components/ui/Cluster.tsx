import type { CSSProperties, ElementType, HTMLAttributes, ReactNode } from 'react'

import { classNames } from './classNames'
import styles from './Cluster.module.css'

/** Zweck-Benennung von Clusters Abstandsmaß -- KEINE rohe Space-Skalenstufe mehr,
 *  sondern ein benannter Einsatzzweck pro tatsächlicher Aufrufstellen-Rolle:
 *  - `'badgeRow'`: dichte, rein lesbare Abzeichen-/Chip-/Tag-/Logo-Reihe ohne Interaktion.
 *  - `'interactiveChipRow'`: Reihe klickbarer Filter-/Auswahl-Chips (z. B. Fansub-Gruppen-
 *    Umschalter).
 *  - `'contentPair'`: zwei unterschiedliche, gleichrangige Inhaltsblöcke nebeneinander (z. B.
 *    Avatar-Gruppe neben Textspalte).
 *  - `'actionRow'`: Aktionslink-Reihe, meist durch eine Trennlinie vom Inhalt oben abgesetzt.
 *  - `'labelWithTrailingMeta'`: eine Hauptbeschriftung links, eine an das Zeilenende gedrückte
 *    Zusatzinfo rechts (z. B. die Episodenkarten-Kopfzeile: Titel-Block + Versionszähler-Badge).
 *    Bewusst NICHT `'contentPair'` wiederverwendet, obwohl beide zwei Bloecke nebeneinander
 *    setzen: `'contentPair'` beschreibt zwei GLEICHRANGIGE Bloecke (var(--space-4)), hier ist der
 *    zweite Block eine untergeordnete Zusatzinfo bei engerem Soll-Abstand (var(--space-3)).
 *  - `'mediaCaption'`: ein Vorschaubild neben seiner Bildunterschrift (z. B. die
 *    Randnavigations-Vorschaukarte: Cover-Thumbnail + Titel/Typ-Textblock).
 *  - `'independentBlocks'`: trennt voneinander unabhängige, gleichrangige Inhaltsblöcke INNERHALB
 *    eines Bausteins -- derselbe Zweck-Name und dasselbe Zweck-Token (`--space-independent-blocks`)
 *    wie Stacks gleichnamiger Zweck, hier für den gestapelten Zustand einer Haltepunkt-Umkehr
 *    (`collapseBelow`/`gapCollapsed`) wiederverwendet statt eines zweiten, neu erfundenen Tokens
 *    mit identischem Wert.
 *  - `'secondaryActionRow'`: dichte, meist rechtsbündige Reihe von 1-2 gleichrangigen
 *    Sekundär-Aktions-Buttons (z. B. "Zur Fansub-Gruppe"/"Zum Projekt" in `FansubGroupContext`s
 *    `.navRow`) -- eigenständig von `'badgeRow'` (dort explizit OHNE Interaktion), von
 *    `'interactiveChipRow'` (Filter-/Auswahl-Chips, 12px statt 8px) und von `'actionRow'` (24px,
 *    meist durch eine Trennlinie vom Inhalt abgesetzt; hier gibt es keine Trennlinie).
 *  Cluster deklariert diese Enum bewusst eigenständig statt sie aus './Stack' zu importieren --
 *  Cluster ist ein eigenständiger Grundbaustein und darf laut Katalog-Taxonomie
 *  (catalogTaxonomy.test.ts) keinen anderen, selbst katalogisierten Grundbaustein importieren,
 *  auch keinen reinen Typ-Import (die Prüfung durchsucht ausschließlich den Quelltext nach
 *  `from './X'`). */
export type ClusterGapPurpose =
  | 'badgeRow'
  | 'interactiveChipRow'
  | 'contentPair'
  | 'actionRow'
  | 'labelWithTrailingMeta'
  | 'mediaCaption'
  | 'independentBlocks'
  | 'secondaryActionRow'

/** Löst jeden Zweck-Wert auf sein eigenes, in `layout.css` deklariertes Zweck-Token auf --
 *  niemals direkt auf die rohe `--space-N`-Grundskala (siehe `ClusterGapPurpose`-Dokumentation oben). */
const GAP_PURPOSE_TOKENS: Record<ClusterGapPurpose, string> = {
  badgeRow: 'var(--space-badge-row)',
  interactiveChipRow: 'var(--space-interactive-chip-row)',
  contentPair: 'var(--space-content-pair)',
  actionRow: 'var(--space-action-row)',
  labelWithTrailingMeta: 'var(--space-label-with-trailing-meta)',
  mediaCaption: 'var(--space-media-caption)',
  independentBlocks: 'var(--space-independent-blocks)',
  secondaryActionRow: 'var(--space-secondary-action-row)',
}

type ClusterJustify = 'start' | 'center' | 'end' | 'between'

const JUSTIFY_KEYWORDS: Record<ClusterJustify, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
}

export interface ClusterProps extends HTMLAttributes<HTMLElement> {
  /** Abstand zwischen den Kindern, als benannter Zweck (Standard 'badgeRow' = var(--space-badge-row)). */
  gap?: ClusterGapPurpose
  /** Querachsen-Ausrichtung der Kinder (Standard 'center'). */
  align?: 'start' | 'center' | 'end' | 'baseline' | 'stretch'
  /** Hauptachsen-Verteilung der Kinder (Standard 'start'). */
  justify?: ClusterJustify
  /** Hauptachsen-Verteilung unterhalb von 767px -- ohne Angabe gilt derselbe Wert wie `justify`
   *  (identischer Override-Hook-Mechanismus wie Stacks alignBelowMd, siehe dort für die Begründung
   *  gegen ein Button.fullWidthBelowMd-artiges Muster). */
  justifyBelowMd?: ClusterJustify
  /** Lässt GENAU das erste Kind wachsen (flex:1 1 0%, min-width:0 als Standard-Flexbox-Idiom gegen
   *  Überlauf) -- für eine Titel-Zeile, deren Heading den nach einem fix breiten Logo verbleibenden
   *  Platz einnehmen soll. Wirkt praktisch nur oberhalb des collapseBelow-Haltepunkts (im gestapelten
   *  Zustand ist die Hauptachse die Höhe, kein begrenzender Container). */
  growFirstChild?: boolean
  /** Umbruch bei fehlendem Platz (Standard true). */
  wrap?: boolean
  /** Haltepunkt, unterhalb dessen Cluster von einer horizontalen Zeile auf eine gestapelte Spalte
   *  kippt (Haltepunkt-Umkehr) -- aktuell nur `'md'` (48rem/768px, derselbe Haltepunkt, den
   *  `SplitLayout` bereits verwendet), da bislang keine Aufrufstelle einen zweiten Wert braucht.
   *  Ohne Angabe bleibt Cluster ein einzelnes, unverändertes Flex-Element (Zero-Pixel-Diff für
   *  jeden bestehenden Aufrufer). */
  collapseBelow?: 'md'
  /** Lücken-Zweck im gestapelten Zustand unterhalb von `collapseBelow` -- ohne Angabe gilt
   *  derselbe Zweck wie `gap` (CSS-Fallback, kein zweiter Pflichtwert). Wirkt nur, wenn
   *  `collapseBelow` tatsächlich gesetzt ist. */
  gapCollapsed?: ClusterGapPurpose
  /** Schwebe-Overlay-Modus: oberhalb von 768px wird das ÄUSSERE Cluster-Wurzelelement selbst zu
   *  einem `position:absolute`-Band, das präzise auf dem Rand seines positionierten Vorfahren
   *  sitzt (z. B. die Randnavigations-Steuerelemente über einem Anime-Kopf) -- `pointer-events:none`
   *  auf dem Wurzelelement selbst, `pointer-events:auto` auf dessen direktem Kind (und damit, per
   *  CSS-Vererbung, auf jedem tatsächlichen Inhalts-Nachfahren), damit das schwebende Band nur
   *  seine eigenen, meist schmalen interaktiven Kinder anklickbar macht und darunterliegenden
   *  Inhalt nicht blockiert. WICHTIG: die Positionierung wird bewusst über eine normale
   *  `@media`-Abfrage (Viewport-Breite) statt einer `@container`-Abfrage ausgelöst -- eine
   *  Container-Abfrage darf laut Spezifikation nie das eigene Container-Wurzelelement selbst
   *  umordnen (siehe Komponentendoku unten), ein `position:absolute` NUR auf dem inneren,
   *  nachfahren-gebundenen Flex-Element würde das äußere Wurzelelement selbst aber als normales,
   *  nur eben 0px hohes Element im Textfluss zurücklassen -- in einem umgebenden Flex-/Grid-
   *  Kontext mit eigenem `gap` (z. B. ein `Stack`, der diesen Cluster neben weiterem Inhalt rendert)
   *  würde dieser 0px-hohe, aber weiterhin TEILNEHMENDE Platzhalter trotzdem einen vollen `gap`-
   *  Abstand erzeugen (CSS-Gap wirkt unabhängig von der tatsächlichen Höhe eines teilnehmenden
   *  Elements). Erst wenn das WURZELELEMENT selbst `position:absolute` trägt, nimmt es am Flex-/
   *  Grid-Layout des Elternelements überhaupt nicht mehr teil (Spezifikation: absolut positionierte
   *  Kinder sind keine Flex-/Grid-Items). Unterhalb von 768px eine normale, im Textfluss liegende
   *  Cluster-Zeile mit dem unveränderten `gap`/`justify`/`align`-Verhalten des Aufrufers. Aktuell
   *  nur `'controlBand'`, da bislang nur ein einziger Anwendungsfall existiert. */
  float?: 'controlBand'
  /** Zu rendernde Element-Art (Standard 'div'). */
  as?: ElementType
  className?: string
  children: ReactNode
}

/**
 * Horizontale Anordnung mehrerer Kinder mit Umbruch und token-basiertem Abstand -- der generische
 * Grundbaustein für jede Chip-/Badge-/Logo-Reihe dieser Codebasis. Setzt bewusst KEINE Fläche/
 * Farbe/Rundung selbst (siehe Stack.tsx für dieselbe Begründung).
 *
 * `collapseBelow`/`gapCollapsed` und `float` sind container-query-getriebene Zusatzfähigkeiten
 * (siehe `SplitLayout.tsx`/`.module.css` für dasselbe Grundmuster): ein Element darf laut
 * CSS-Spezifikation nicht gleichzeitig der eigene `@container`-Namensgeber UND das von dessen
 * Abfrage umgeordnete Element sein. Ist eine der beiden Props gesetzt, rendert Cluster deshalb
 * zweistufig -- ein äußeres Element trägt NUR `container: cluster / inline-size`, das eigentliche
 * Flex-/Positionierungsverhalten lebt in einem inneren Kind-Element. Ist KEINE der beiden Props
 * gesetzt, bleibt Cluster ein einzelnes, unverändertes Element wie bisher (Zero-Pixel-Diff für
 * jeden bestehenden Aufrufer).
 */
export function Cluster({
  gap = 'badgeRow',
  align = 'center',
  justify = 'start',
  justifyBelowMd,
  growFirstChild,
  wrap = true,
  collapseBelow,
  gapCollapsed,
  float,
  as: Component = 'div',
  className,
  children,
  style,
  ...props
}: ClusterProps) {
  const mergedStyle = {
    ...style,
    '--cluster-gap': GAP_PURPOSE_TOKENS[gap],
    '--cluster-align': align,
    '--cluster-justify': JUSTIFY_KEYWORDS[justify],
    '--cluster-wrap': wrap ? 'wrap' : 'nowrap',
    ...(gapCollapsed !== undefined ? { '--cluster-gap-collapsed': GAP_PURPOSE_TOKENS[gapCollapsed] } : {}),
    ...(justifyBelowMd !== undefined ? { '--cluster-justify-below-md': JUSTIFY_KEYWORDS[justifyBelowMd] } : {}),
  } as CSSProperties

  if (collapseBelow === undefined && float === undefined) {
    return (
      <Component
        {...props}
        style={mergedStyle}
        className={classNames(styles.cluster, growFirstChild && styles.clusterGrowFirstChild, className)}
      >
        {children}
      </Component>
    )
  }

  return (
    <Component
      {...props}
      style={mergedStyle}
      className={classNames(
        styles.clusterQueryContainer,
        // `float`s eigentliche Schwebe-Positionierung (position:absolute/pointer-events:none)
        // sitzt bewusst HIER, auf dem äußeren Wurzelelement, nicht auf dem inneren Flex-Kind
        // unten -- siehe die ausführliche Begründung in der `float`-Prop-Doku oben (nur das
        // Wurzelelement selbst kann ein umgebendes Flex-/Grid-`gap` vollständig umgehen).
        float === 'controlBand' && styles.floatControlBandRoot,
        className,
      )}
    >
      {/* Eigenes Flex-Kind-Element: das `Component`-Element oben bildet nur den benannten
       *  Container (plus, bei `float`, dessen eigene Schwebe-Positionierung), das eigentliche
       *  Zeilen-Verhalten lebt hier als Nachfahre (siehe Komponentendoku oben bzw.
       *  SplitLayout.tsx für dasselbe Container-Grundmuster). Liest die `--cluster-*`-Variablen
       *  per CSS-Vererbung vom äußeren Element, trägt selbst keinen Inline-Stil. */}
      <div
        className={classNames(
          styles.cluster,
          collapseBelow === 'md' && styles.collapsibleMd,
          growFirstChild && styles.clusterGrowFirstChild,
          float === 'controlBand' && styles.floatControlBand,
        )}
      >
        {children}
      </div>
    </Component>
  )
}
