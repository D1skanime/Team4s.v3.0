import { Children, type CSSProperties, type ElementType, type HTMLAttributes, type ReactNode } from 'react'

import { classNames } from './classNames'
import styles from './Stack.module.css'

/** Zweck-Benennung von Stacks Abstandsmaß -- KEINE rohe Space-Skalenstufe mehr,
 *  sondern ein benannter Einsatzzweck, der intern über ein eigenes Zweck-Token in
 *  `src/styles/tokens/layout.css` auf die unveränderte `--space-N`-Grundskala verweist. Die
 *  Namen beschreiben die tatsächliche STRUKTUR der gestapelten Kinder, nicht eine Größe
 *  (die vormalige Benennung enthielt ein Größenwort und einen mit Seitenabschnitts-Abstand
 *  verwechselbaren Namen, obwohl beide Zwecke rein INNERHALB eines Bausteins gelten):
 *  - `'independentBlocks'`: trennt voneinander unabhängige, gleichrangige Inhaltsblöcke INNERHALB
 *    eines Bausteins (z. B. Merklisten-Knopf, Trennlinie und Genre-Abschnitt im Anime-Kopf;
 *    einzelne Episodenzeilen in der Episodenliste). Niemals Abstand zwischen Seitenabschnitten --
 *    das bleibt Aufgabe der Seite selbst, nie dieses Grundbausteins.
 *  - `'relatedContent'`: fasst eng zusammengehörige Inhalte dicht zusammen, die gemeinsam EINE
 *    Einheit beschreiben (ein Eyebrow-Label mit seiner Chip-Reihe, oder die Metadatenzeilen EINER
 *    Release-Zeile).
 *  - `'captionLines'`: engster Abstand (nur 4px) zwischen GENAU zwei Textzeilen, die gemeinsam
 *    EINE einzige Bildunterschrift/Beschriftung bilden (z. B. Titel- und Typzeile der
 *    Randnavigations-Vorschaukarte) -- enger als `'relatedContent'`, da hier kein eigenständiger
 *    zweiter Inhaltsblock entsteht, sondern nur der Zeilenumbruch EINER Beschriftung.
 *  - `'headingToBadges'`: Abstand zwischen einem Überschriften-/Titelbereich und der direkt
 *    folgenden Status-/Klassifikations-Abzeichenreihe (z. B. Anime-Titel+Logo vor den Status-/
 *    Typ-/Jahr-Badges im Anime-Kopf) -- eigenständig von `'independentBlocks'`, da hier eine
 *    Überschrift unmittelbar von ihrer Kennzeichnung gefolgt wird, nicht zwei gleichrangige Blöcke.
 *  - `'primaryContentBlocks'`: trennt deutlich voneinander abgegrenzte Haupt-Inhaltsblöcke
 *    innerhalb eines Bausteins (z. B. Abzeichenreihe, Beschreibungstext und Tag-Abschnitt im
 *    Anime-Kopf) -- großzügiger als `'independentBlocks'`, da hier ein inhaltlich bedeutsamerer
 *    Blockwechsel markiert wird, aber weiterhin rein INNERHALB eines Bausteins (kein
 *    Seitenabschnitts-Abstand).
 *  - `'dividedSectionLeadIn'`: Abstand vor einer durch eine Trennlinie abgesetzten, nachrangigen
 *    Zusatzsektion (z. B. "Verwandte Anime" unterhalb des Info-Banners im Anime-Kopf) --
 *    unterhalb des Mobil-Haltepunkts (767px) responsiv reduziert, da der Inhalt dort bereits
 *    einspaltig gestapelt ist und weniger visuellen Vorlauf braucht.
 *  - `'dividerToContent'`: Abstand zwischen einer vorangehenden Trennlinie (spacing="none", der
 *    komplette Vorlauf kommt bereits über einen eigenen Lücken-Eintrag) und dem direkt folgenden
 *    Inhalt (z. B. Statistik-Zeile/"Verwandte Anime"-Abschnitt im Anime-Kopf, deren vormalige
 *    Rahmenlinie durch ein eigenständiges `Divider`-Element ersetzt wurde).
 *  - `'contentToControlBand'`: Abstand zwischen einem Haupt-Inhaltsblock und einer direkt
 *    darunter gerenderten, schwebenden Steuerelement-Reihe (`Cluster float="controlBand"`, z. B.
 *    die Randnavigation unterhalb des Zwei-Spalten-Rasters im Anime-Kopf) -- wirkt nur sichtbar,
 *    solange die Steuerelement-Reihe unterhalb ihres eigenen Haltepunkts normal im Textfluss
 *    liegt; oberhalb davon ist sie aus dem Textfluss genommen und nimmt an diesem Abstand gar
 *    nicht teil (kein doppelter/falscher Abstand oberhalb des Haltepunkts).
 *  - `'supportingBlockToContent'`: Abstand zwischen den eigenen, unterstützenden Blöcken eines
 *    Bausteins (z. B. Gruppen-Auswahl und Gruppen-Kontext in `FansubVersionBrowser`, beide optional
 *    gar nicht gerendert) und dem danach folgenden Hauptinhalt (z. B. der Episodenliste) --
 *    eigenständig von `'headingToBadges'` (fest an eine vorausgehende Überschrift gebunden) und
 *    `'dividerToContent'` (fest an eine vorausgehende Trennlinie gebunden), da hier weder eine
 *    Überschrift noch eine Trennlinie vorausgeht, sondern ein eigenständiger, optional ganz
 *    entfallender Vorab-Block.
 *  - `'none'`: kein zusätzlicher Eigen-Abstand -- für den Fall, dass das nachfolgende Kind seinen
 *    Abstand zum vorherigen bereits vollständig selbst mitbringt (z. B. ein Kind, dessen erstes
 *    eigenes Element eine Trennlinien-Komponente mit eigenem Außenabstand ist). */
export type StackGapPurpose =
  | 'independentBlocks'
  | 'relatedContent'
  | 'captionLines'
  | 'headingToBadges'
  | 'primaryContentBlocks'
  | 'dividedSectionLeadIn'
  | 'dividerToContent'
  | 'contentToControlBand'
  | 'supportingBlockToContent'
  | 'none'

/** Löst jeden Zweck-Wert auf sein eigenes, in `layout.css` deklariertes Zweck-Token auf --
 *  niemals direkt auf die rohe `--space-N`-Grundskala (siehe `StackGapPurpose`-Dokumentation oben).
 *  `'none'` wird separat als Literal `'0'` behandelt, nicht über diese Tabelle (dasselbe Muster
 *  wie Cards `CardPaddingPurpose`). */
const GAP_PURPOSE_TOKENS: Record<Exclude<StackGapPurpose, 'none'>, string> = {
  independentBlocks: 'var(--space-independent-blocks)',
  relatedContent: 'var(--space-related-content)',
  captionLines: 'var(--space-caption-lines)',
  headingToBadges: 'var(--space-heading-to-badges)',
  primaryContentBlocks: 'var(--space-primary-content-blocks)',
  dividedSectionLeadIn: 'var(--space-divided-section-lead-in)',
  dividerToContent: 'var(--space-divider-to-content)',
  contentToControlBand: 'var(--space-content-to-control-band)',
  supportingBlockToContent: 'var(--space-supporting-block-to-content)',
}

/** Löst einen einzelnen Zweck-Wert auf seinen CSS-Wert auf -- `'none'` ergibt den Literalwert
 *  `'0'`, jeder andere Wert sein eigenes Zweck-Token (siehe `GAP_PURPOSE_TOKENS`). Gemeinsam von
 *  Einzelwert- UND Rhythmus-Array-Modus genutzt, damit `'none'` in beiden Pfaden gleich behandelt wird. */
function resolveGapValue(purpose: StackGapPurpose): string {
  return purpose === 'none' ? '0' : GAP_PURPOSE_TOKENS[purpose]
}

export interface StackProps extends HTMLAttributes<HTMLElement> {
  /** Abstand zwischen den Kindern, als benannter Zweck (Standard 'independentBlocks' =
   *  var(--space-independent-blocks)). Der ÜBERWIEGENDE Regelfall ist ein einzelner Zweck-Wert --
   *  einheitlicher Abstand zwischen allen Kindern, wie bisher über das native CSS-`gap` gelöst.
   *  Ein ARRAY von Zweck-Werten ist der Ausnahmefall für einen bewusst NICHT-einheitlichen
   *  Kind-zu-Kind-Abstandsrhythmus (z. B. eine Info-Karte, deren Titelzeile/Badges/Beschreibung/
   *  Tags jeweils einen eigenen, fachlich begründeten Abstand zur nächsten Zeile brauchen): die
   *  Array-Länge MUSS exakt `Kinderzahl - 1` sein (ein Wert pro LÜCKE zwischen zwei
   *  aufeinanderfolgenden Kindern, nicht ein Wert pro Kind) -- eine abweichende Länge wirft beim
   *  Rendern einen Fehler, damit eine spätere Kind-Änderung nie eine stillschweigend falsche
   *  Abstandszuordnung erzeugt. */
  gap?: StackGapPurpose | StackGapPurpose[]
  /** Querachsen-Ausrichtung der Kinder (Standard 'stretch'). */
  align?: 'start' | 'center' | 'end' | 'stretch'
  /** Querachsen-Ausrichtung unterhalb von 767px -- ohne Angabe gilt derselbe Wert wie `align` (CSS-
   *  Fallback-Kette, kein zweiter Pflichtwert, identischer Override-Hook-Mechanismus wie Cards
   *  --card-padding-override/--card-width-override, NICHT Buttons hartcodiertes fullWidthBelowMd --
   *  dort genügt ein reiner Boolean, hier wird einer von vier Enum-Werten gebraucht). */
  alignBelowMd?: 'start' | 'center' | 'end' | 'stretch'
  /** Zu rendernde Element-Art (Standard 'div'). */
  as?: ElementType
  className?: string
  children: ReactNode
}

/**
 * Vertikale Anordnung mehrerer Kinder mit festem, token-basiertem Abstand -- der generische
 * Layout-Grundbaustein für jede Kopf-zu-Fuß-Anordnung dieser Codebasis (z. B. Titelzeile über
 * Beschreibung über Kennzahlen). Setzt bewusst KEINE Fläche/Farbe/Rundung selbst -- diese kommen
 * aus den umschließenden Card-/MediaFrame-Varianten, niemals aus Stack selbst (siehe CLAUDE.md
 * "Frontend-UI": Rundungen/Flächen bleiben bei den dafür vorgesehenen Bausteinen).
 */
export function Stack({
  gap = 'independentBlocks',
  align = 'stretch',
  alignBelowMd,
  as: Component = 'div',
  className,
  children,
  style,
  ...props
}: StackProps) {
  if (Array.isArray(gap)) {
    // Rhythmus-Modus: das native CSS-`gap` kann nur EINEN einheitlichen Abstand ausdrücken, hier
    // wird es deshalb auf den literalen Wert '0' gesetzt und jede Lücke stattdessen über einen
    // schlanken, ausschließlich mit `marginTop` versehenen Wrapper vor dem jeweils folgenden Kind
    // nachgebildet -- analog zum bestehenden `--stack-gap`-Override-Hook-Muster, aber pro Lücke
    // statt global. Kein className/keine weitere Deklaration auf dem Wrapper, damit kein neues
    // Flächen-/Farb-/Rundungs-Surface entsteht (siehe Komponentendokumentation unten).
    const childArray = Children.toArray(children)
    const expectedGapCount = childArray.length - 1
    if (gap.length !== expectedGapCount) {
      throw new Error(
        `Stack: Rhythmus-Array "gap" erwartet genau ${expectedGapCount} Werte (eine Lücke pro Paar ` +
          `aufeinanderfolgender Kinder bei ${childArray.length} Kindern), erhielt aber ${gap.length}.`,
      )
    }

    return (
      <Component
        {...props}
        style={{
          ...style,
          '--stack-gap': '0',
          '--stack-align': align,
          ...(alignBelowMd !== undefined ? { '--stack-align-below-md': alignBelowMd } : {}),
        } as CSSProperties}
        className={classNames(styles.stack, className)}
      >
        {childArray.map((child, index) =>
          index === 0 ? (
            child
          ) : (
            <div key={index} style={{ marginTop: resolveGapValue(gap[index - 1]) }}>
              {child}
            </div>
          ),
        )}
      </Component>
    )
  }

  return (
    <Component
      {...props}
      style={{
        ...style,
        '--stack-gap': resolveGapValue(gap),
        '--stack-align': align,
        ...(alignBelowMd !== undefined ? { '--stack-align-below-md': alignBelowMd } : {}),
      } as CSSProperties}
      className={classNames(styles.stack, className)}
    >
      {children}
    </Component>
  )
}
