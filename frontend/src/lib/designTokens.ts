/**
 * Reine Lese-/Gruppierungslogik für Team4s' CSS-Custom-Property-Katalog (`:root` in
 * globals.css). Framework-unabhängig und ohne DOM-Zugriff, damit dieselbe Logik sowohl im
 * Storybook-Browser (DesignTokensShowcase.tsx liest den tatsächlichen `:root`-Regeltext aus
 * `document.styleSheets`) als auch in Node-Tests (die den rohen Dateitext von globals.css per
 * `fs.readFileSync` einlesen) exakt dieselben Tokens liefert -- keine zweite, von Hand gepflegte
 * Token-Liste.
 */

export interface DesignToken {
  name: string
  /** Roher, deklarierter Wert aus dem Quelltext (z. B. "var(--color-bg-light)" statt des
   *  aufgelösten Endwerts) -- zeigt Aufrufern die tatsächliche Token-Kette, nicht nur die Farbe. */
  value: string
}

export interface DesignTokenGroup {
  key: string
  label: string
  tokens: DesignToken[]
}

/** Deutsche Anzeige-Beschriftung je Namens-Familie (erstes Segment nach "--"). Eine fehlende
 *  Familie fällt auf das großgeschriebene Rohsegment zurück (siehe `labelForGroupKey`) --
 *  ein neu hinzugefügtes Token verschwindet dadurch nie, sondern erscheint bestenfalls unter
 *  einer noch unübersetzten Gruppe. */
const GROUP_LABELS: Record<string, string> = {
  font: 'Typografie',
  color: 'Farbpalette (Rohtöne)',
  bg: 'Hintergrund (Alt-Tokens)',
  text: 'Textfarben',
  border: 'Rahmen',
  surface: 'Oberflächen',
  accent: 'Akzentfarben',
  avatar: 'Avatar-Farbfamilie',
  tag: 'Medien-Kategorie-Tags',
  link: 'Community-Link-Farben',
  scrim: 'Scrim (Overlay auf Bildern)',
  media: 'Medien-Kacheln',
  ui: 'UI-Akzente',
  ach: 'Erfolgsabzeichen-Farben',
  button: 'Button',
  state: 'Status-Icons',
  status: 'Anime-Status',
  radius: 'Rundungen',
  space: 'Abstände',
  shadow: 'Schatten',
  focus: 'Fokus',
  transition: 'Übergänge',
  control: 'Steuerelement-Höhen',
  modal: 'Modal-Maße',
  drawer: 'Drawer-Maße',
  field: 'Formularfeld',
  selection: 'Auswahl-Kachel',
  picker: 'Datums-/Jahres-Picker',
  z: 'Ebenen (z-index)',
  content: 'Inhaltsbreiten',
  public: 'Öffentliche Seiten',
  profile: 'Profil',
  role: 'Rollen',
  // Ergänzungen aus Befund 28 (Runde 3, 2026-11-04): explizite deutsche Namen für die
  // Bausteinwerte-Stufe der Design-Tokens-Seite, statt sich auf die großgeschriebene
  // Rohsegment-Rückfalllogik zu verlassen -- card/button sahen zufällig bereits "gut genug"
  // aus, bekommen hier aber einen EXPLIZITEN Eintrag, die übrigen hätten ohne Eintrag ein
  // falsches oder unverständliches Rohsegment gezeigt (z. B. "Focal" statt "Fokus-Karussell").
  card: 'Card',
  focal: 'Fokus-Karussell',
  split: 'Zwei-Spalten-Raster',
  disclosure: 'Aufklapp-Kopfzeile',
  adjacent: 'Nebeneinander',
  date: 'Datum',
  empty: 'Leer-Zustand',
}

function groupKeyFor(tokenName: string): string {
  return tokenName.replace(/^--/, '').split('-')[0]
}

function labelForGroupKey(key: string): string {
  return GROUP_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1)
}

/**
 * Extrahiert alle `--name: wert;`-Deklarationen aus einem oder mehreren aneinandergehängten
 * `:root { ... }`-Regelblöcken (reiner Text, z. B. die komplette globals.css-Datei oder die
 * `cssText`-Werte mehrerer `:root`-CSSOM-Regeln). Arbeitet textbasiert statt über CSSOM-
 * Werteinterpretation, damit moderne Funktionswerte (`clamp()`, `color-mix()`, Verläufe) nicht
 * durch eine Browser-/jsdom-spezifische Nachparsung verfälscht werden. Mehrfach deklarierte Namen
 * behalten die ZULETZT im Text gefundene Deklaration (entspricht der echten CSS-Kaskade).
 */
export function extractDesignTokens(cssText: string): DesignToken[] {
  const tokensByName = new Map<string, DesignToken>()
  const rootBlockPattern = /:root\s*\{([^}]*)\}/g
  let blockMatch: RegExpExecArray | null
  while ((blockMatch = rootBlockPattern.exec(cssText))) {
    const declarationPattern = /(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/g
    let declarationMatch: RegExpExecArray | null
    while ((declarationMatch = declarationPattern.exec(blockMatch[1]))) {
      const name = declarationMatch[1]
      const value = declarationMatch[2].trim()
      tokensByName.set(name, { name, value })
    }
  }
  return [...tokensByName.values()]
}

/** Gruppiert Tokens automatisch nach ihrer Namens-Familie (erstes Segment nach "--", z. B.
 *  "--space-3" -> "space") -- keine von Hand gepflegte Zuordnungsliste je Token, jede neue
 *  Deklaration mit bestehendem Namenspräfix landet automatisch in der richtigen Gruppe. Gruppen
 *  sind alphabetisch nach deutscher Beschriftung sortiert. */
export function groupDesignTokens(tokens: DesignToken[]): DesignTokenGroup[] {
  const tokensByKey = new Map<string, DesignToken[]>()
  for (const token of tokens) {
    const key = groupKeyFor(token.name)
    const bucket = tokensByKey.get(key)
    if (bucket) bucket.push(token)
    else tokensByKey.set(key, [token])
  }
  return [...tokensByKey.entries()]
    .map(([key, groupedTokens]) => ({ key, label: labelForGroupKey(key), tokens: groupedTokens }))
    .sort((a, b) => a.label.localeCompare(b.label, 'de'))
}

/** Erkennt, ob ein deklarierter Tokenwert als Farbe/Verlauf darstellbar ist (für eine
 *  Vorschau-Kachel) -- über eine echte Browser-/jsdom-CSS-Validierung (`color`-Eigenschaft
 *  akzeptiert ausschließlich gültige `<color>`-Werte, im Unterschied zu `background`, das auch
 *  bloße Längen wie "12px" als Positionsangabe akzeptieren würde) statt einer eigenen
 *  Regex-Heuristik über Werte-Syntax. Verläufe (`background` statt `color`) werden separat per
 *  Substring erkannt, da `color` keine `linear-gradient()`-Werte akzeptiert. */
export function isColorLikeValue(value: string): boolean {
  if (!value) return false
  if (/gradient\(/.test(value)) return true
  if (typeof document === 'undefined') return false
  const probe = document.createElement('span')
  probe.style.color = value
  return probe.style.color !== ''
}

/** Die drei Gliederungs-Stufen der Design-Tokens-Seite (Befund 28, Runde 3): "foundation" =
 *  rohe Grundskala mit sichtbarer Vorschau (z. B. --space-3, --radius-sm), "purpose" = benannter
 *  Verwendungszweck INNERHALB einer Grundskala, der per `var()` auf einen Grundwert verweist
 *  (z. B. --space-section -> var(--space-3)), "component" = jeder Token, der zu keiner Grundskala
 *  gehört, sondern zu einem einzelnen Grundbaustein (Card/Button/Avatar/...). */
export type TokenTier = 'foundation' | 'purpose' | 'component'

/** Welche Namens-Familien überhaupt eine Grundskala im obigen Sinn bilden -- jede andere Familie
 *  (z. B. "card", "button", "avatar") gehört vollständig zur Bausteinwerte-Stufe, da sie zu genau
 *  einem Grundbaustein gehört statt eine wiederverwendbare Skala zu sein. Je Familie entscheidet
 *  die Regel anhand der Namens-SEGMENTE NACH dem Familien-Präfix, ob ein konkretes Token noch
 *  ein roher Skalenwert ("foundation") oder schon ein benannter Verwendungszweck ("purpose") ist:
 *  - space: eine reine Zahl (--space-3) ist die Skala selbst, jeder benannte Rest
 *    (--space-section) ein Zweck.
 *  - radius/shadow: ein kleines, festes Stufen-Vokabular (sm/md/lg/pill bzw. xs/sm/md/lg) ist die
 *    Skala selbst, jeder andere Rest (--radius-surface, --shadow-inset-highlight) ein Zweck.
 *  - font: die rohen Schriftfamilien (--font-sans/-mono) sowie die Größen-Skala
 *    (--font-size-h1..h4/-hero/-sm) sind die Grundskala, Gewichts-Zweckwerte
 *    (--font-weight-heading/-label) sind ein benannter Zweck.
 *  - color: die GESAMTE Familie ist die rohe Grundpalette selbst (palette.css) -- sie enthält
 *    keine `var()`-Zweck-Aliase auf sich selbst, jeder Alias (--bg-primary, --text-primary
 *    usw.) führt bereits eine EIGENE Namens-Familie und gehört zur Bausteinwerte-Stufe. */
const FOUNDATION_FAMILY_RULES: Record<string, (nameTailSegments: string[]) => boolean> = {
  space: (tail) => tail.length === 1 && /^\d+$/.test(tail[0]),
  radius: (tail) => tail.length === 1 && ['sm', 'md', 'lg', 'pill'].includes(tail[0]),
  shadow: (tail) => tail.length === 1 && ['xs', 'sm', 'md', 'lg'].includes(tail[0]),
  font: (tail) =>
    (tail.length === 1 && ['sans', 'mono'].includes(tail[0])) ||
    (tail[0] === 'size' && ['h1', 'h2', 'h3', 'h4', 'hero', 'sm'].includes(tail[1])),
  color: () => true,
}

/** Familien-Schlüssel, die überhaupt eine Grundskala bilden (siehe `FOUNDATION_FAMILY_RULES`) --
 *  von der Design-Tokens-Seite genutzt, um Grundskala-Gruppen (Tier 1) von Bausteinwerte-Gruppen
 *  (Tier 3) zu trennen, ohne die Regel-Zuordnung selbst zu duplizieren. */
export const FOUNDATION_GROUP_KEYS: readonly string[] = Object.keys(FOUNDATION_FAMILY_RULES)

/** Ordnet ein einzelnes Token einer der drei Gliederungs-Stufen zu (siehe `TokenTier`). Bleibt
 *  vollständig automatisch -- die Zuordnung ergibt sich ausschließlich aus dem bereits
 *  vorhandenen Namens-Präfix (`groupKey`, von `groupKeyFor` bzw. `groupDesignTokens` berechnet)
 *  und den Namens-Segmenten danach, keine Token-für-Token-Liste. */
export function classifyToken(token: DesignToken, groupKey: string): TokenTier {
  const rule = FOUNDATION_FAMILY_RULES[groupKey]
  if (!rule) return 'component'
  const tail = token.name.replace(/^--/, '').split('-').slice(1)
  return rule(tail) ? 'foundation' : 'purpose'
}

/** Erkennt, ob ein deklarierter Rohwert eine direkte `var()`-Verweiskette auf ein anderes Token
 *  ist (z. B. "var(--space-3)") statt eines eigenständigen Literalwerts (Zahl/Hex/Funktionsaufruf
 *  wie "4px"/"#fff"/"linear-gradient(...)"). Grundlage für die Bausteinwerte-Markierung in
 *  `DesignTokensShowcase.tsx`: ein Wert, der NICHT mit `var(` beginnt, nutzt noch keinen
 *  Zweck-Token und wird dort sichtbar markiert (Markierung, keine Korrektur -- siehe Befund 28). */
export function isVarReference(value: string): boolean {
  return value.trimStart().startsWith('var(')
}

/** Liest den referenzierten Token-Namen aus einem `var(--x)`-Wert aus (z. B. "--space-3" aus
 *  "var(--space-3)"), oder `null`, wenn der Wert keine var()-Verweiskette ist. Dient dem
 *  Zweck-Tokens-Rückverweis auf der Design-Tokens-Seite ("-> 12px, Grundstufe --space-3"), ohne
 *  eine eigene Parsing-Abhängigkeit einzuführen -- reiner Text-Regex auf dem bereits vorhandenen
 *  `token.value`. */
export function resolveVarReferenceName(value: string): string | null {
  const match = /^var\(\s*(--[a-zA-Z0-9-]+)/.exec(value.trim())
  return match ? match[1] : null
}
