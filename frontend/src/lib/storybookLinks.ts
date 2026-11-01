/**
 * Erzeugt echte Storybook-Dokumentationslinks für "Besteht aus:"-Kompositionsbeschreibungen,
 * statt eines bloßen Namens als Text. Berechnet die Ziel-URL nach demselben `sanitize`-
 * Algorithmus, den Storybook selbst für Titel -> Story-ID verwendet (`storybook/dist/_browser-
 * chunks/chunk-NULBREPZ.js`s `sanitize`-Funktion exakt nachgebildet und gegen alle 62
 * Autodocs-Einträge eines echten `storybook build`-Laufs verifiziert) -- der Link muss dadurch
 * nie von Hand getippt werden und bleibt auch bei einem künftig umbenannten Titel durch
 * `storybookDescriptionLinks.regression.test.ts` nachweisbar korrekt (die dort geprüfte
 * Gegenprobe: der referenzierte Titel muss als echter `title:`-Wert in irgendeiner
 * `.stories.tsx`-Datei existieren).
 */

function sanitizeStorybookTitleSegment(value: string): string {
  return value
    .toLowerCase()
    .replace(/[ ’–—―′¿'`~!@#$%^&*()_|+\-=?;:'",.<>{}[\]\\/]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
}

/** Baut den Storybook-Manager-Deep-Link (`?path=/docs/<id>--docs`) zur Autodocs-Seite eines
 *  anderen Bausteins, z. B. `storybookDocsPath('Grundbausteine/IconButton')`. */
export function storybookDocsPath(title: string): string {
  return `?path=/docs/${sanitizeStorybookTitleSegment(title)}--docs`
}

/** Baut eine Markdown-Verlinkung (`[Label](Pfad)`) für eine `Besteht aus:`-Beschreibung --
 *  `label` ist üblicherweise der Komponentenname, `title` dessen voller Storybook-Titel
 *  (`'<Kategorie>/<Komponente>'`). */
export function storybookDocsLink(title: string, label: string): string {
  return `[${label}](${storybookDocsPath(title)})`
}
