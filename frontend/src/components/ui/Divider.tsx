import { classNames } from './classNames'
import styles from './Divider.module.css'

/**
 * Themenfarbene horizontale Trennlinie für Inhalte auf einer bereits dunklen/durchscheinenden
 * Fläche (Foto-/Glas-Hintergrund) -- eigenständiger Grundbaustein statt einer weiteren
 * `AccentRule`-Variante, bewusst eine ANDERE Zweck-/Farbfamilie: `AccentRule` ist eine markante,
 * fest auf die Wein-/Markenakzentfarbe (`--ui-line`) gebundene Zierlinie (z. B. unter einer
 * Abschnittsüberschrift), während `Divider` neutral trennt und dieselbe "Rahmen auf Medien-
 * fläche"-Tokenfamilie (`--border-on-media`/`--border-on-media-strong`) liest, die Cards
 * Glas-Varianten und ReleasePreviewRows Logo-Rahmen bereits verwenden. Divider setzt selbst
 * seinen kompletten Außenabstand und seine Farbe -- ein Aufrufer braucht dafür keine eigene
 * `<hr>`+`background`/`margin`-CSS mehr zu schreiben.
 */
export interface DividerProps {
  /** Linienfarbe -- 'onMedia' (Standard, dezent) oder 'onMediaStrong' (kräftiger). Beide Werte
   *  entsprechen exakt den bestehenden --border-on-media(-strong)-Tokens, Divider erfindet keine
   *  neue Farbe. */
  tone?: 'onMedia' | 'onMediaStrong'
  /** Vertikaler Außenabstand als benannter Zweck, nicht als rohe Space-Stufe:
   *  - 'withinMetaBlock' trennt zwei eng verwandte Elemente INNERHALB eines einzelnen
   *    Meta-/Info-Blocks (z. B. zwei Metadatenzeilen im Poster-Bereich) -- knapper Abstand.
   *  - 'betweenSections' (Standard) trennt zwei eigenständige Inhaltsabschnitte innerhalb
   *    einer Karte (z. B. Titelblock vs. verwandte Inhalte) -- großzügiger Abstand.
   *  - 'none' setzt KEINEN eigenen Außenabstand -- für den Fall, dass der komplette Vorlauf-/
   *    Nachlauf-Abstand bereits vollständig von einem umgebenden Rhythmus-Mechanismus (z. B.
   *    Stacks Rhythmus-Array-Modus) übernommen wird und die Trennlinie selbst nur noch die
   *    sichtbare Linie beisteuern soll, ohne diesen fremd festgelegten Rhythmus durch einen
   *    eigenen, nicht abschaltbaren Zusatz-Abstand zu verfälschen.
   */
  spacing?: 'withinMetaBlock' | 'betweenSections' | 'none'
  /** Darf AUSSCHLIESSLICH für responsive Sichtbarkeit (z. B. display:none ab einem Haltepunkt)
   *  verwendet werden -- Außenabstand und Farbe bleiben allein Sache von Divider selbst, ein
   *  Aufrufer setzt über diese Klasse weder margin noch background. */
  className?: string
}

export function Divider({ tone = 'onMedia', spacing = 'betweenSections', className }: DividerProps) {
  return (
    <hr
      aria-hidden="true"
      className={classNames(
        styles.divider,
        tone === 'onMediaStrong' && styles.dividerOnMediaStrong,
        spacing === 'withinMetaBlock' && styles.dividerWithinMetaBlock,
        spacing === 'none' && styles.dividerNoSpacing,
        className,
      )}
    />
  )
}
