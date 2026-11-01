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
  button: 'Button-Verläufe',
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
