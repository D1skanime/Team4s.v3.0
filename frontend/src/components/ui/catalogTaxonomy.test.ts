import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Automatische Qualitätssicherung gegen stillschweigende Grundbaustein-zu-Grundbaustein-
 * Verbünde (UAT-Befund 4/7): ein Primitiv unter der Storybook-Kategorie "Grundbausteine/*"
 * verspricht per Definition (siehe CLAUDE.md "Frontend-UI"), KEINE andere components/ui-
 * Komponente intern zu importieren -- komponiert es sichtbar mehrere benannte Grundbausteine,
 * gehört es nach "Zusammengesetzte Bausteine/*" (wie bei den zehn in Befund 7 bereits
 * umsortierten Komponenten). Dieser Test liest NUR die realen Quelldateien per `fs` (kein
 * jsdom-Rendering, Muster analog zu roleCatalog.accessibility.test.ts) und schlägt bei jedem
 * nicht dokumentierten Fall mit Datei+Import in der Fehlermeldung fehl, statt ein
 * stillschweigendes Abdriften der Taxonomie erst bei der nächsten Live-UAT zu entdecken.
 */

const UI_DIR = path.resolve(process.cwd(), 'src/components/ui')

/** Deklarierte Ausnahmen: ein Import gilt trotz eigener X.stories.tsx NICHT als Verstoß, wenn
 *  er hier mit einer fachlichen Begründung gelistet ist. */
const EXCEPTIONS: Record<string, string[]> = {
  // Spinner ist ausschließlich ein internes Implementierungsdetail von Buttons Lade-Zustand,
  // kein sichtbarer, eigenständig komponierter Baustein-Verbund -- anders als z. B.
  // Modal+DialogHeader+IconButton (die deshalb bereits unter "Zusammengesetzte Bausteine"
  // stehen).
  Button: ['Spinner'],
  // Card bleibt bewusst ein Grundbaustein: seine Grundfläche (Rahmen/Hintergrund/Schatten) steht
  // für sich, Titel/Beschreibung sind nur ein OPTIONALER Teil (title/description-Props). Dass
  // dieser optionale Titel intern Heading/Text nutzt, ist dieselbe Art geteilter Typografie-
  // Grundbaustein-Wiederverwendung wie ein Button, der intern ein Icon aus lucide-react
  // einbindet -- keine sichtbar KOMPONIERTE Kombination mehrerer benannter Bausteine, die ein
  // Aufrufer selbst zusammensetzt (anders als bei PageHeader/SectionHeader unten, die deshalb
  // nach "Zusammengesetzte Bausteine" verschoben wurden, UAT-Runde 4, Befund 1, 2026-10-30).
  Card: ['Heading', 'Text'],
  // Table bleibt bewusst ein Grundbaustein: die <table>/<thead>/<tbody>/<tr>/<td>-Familie ist
  // eine reine Daten-Tabellen-Grundstruktur. TableEmptyState ist nur EIN optionaler Hilfs-Export
  // für den Sonderfall "keine Zeilen" innerhalb dieser Grundstruktur (StatusIcon/Heading/Text
  // für dieselbe Optik wie EmptyState) -- kein vom Aufrufer sichtbar komponierter Baustein-
  // Verbund, den die Tabelle selbst erzwingt (UAT-Runde 4, Befund 2, 2026-10-30).
  Table: ['Heading', 'StatusIcon', 'Text'],
}

/** Story-Dateien unter "Grundbausteine/*", die bewusst KEINE eigene X.tsx haben, weil sie reine
 *  Dokumentations-Seiten ohne eigene Produktkomponente sind (z. B. eine Typografie-Übersicht).
 *  Jeder WEITERE Fall muss hier bewusst mit Begründung ergänzt werden -- sonst schlägt der
 *  Test fehl. Das fängt z. B. einen Tippfehler im Dateinamen ab, der sonst stillschweigend als
 *  "hat halt keine X.tsx" durchgehen würde, statt auf eine echte Inkonsistenz hinzuweisen. */
const DOCUMENTATION_ONLY_STORIES = new Set([
  'TypographyOverview', // reine Typografie-Übersichtsseite (H1-H4, Text-Varianten), kein Baustein
])

function extractTitle(fileContent: string): string | null {
  const match = fileContent.match(/title:\s*'([^']+)'/)
  return match ? match[1] : null
}

/**
 * Erfasst lokale Geschwister-Importe sowohl als statisches `from './X'`/`from "./X"` ALS AUCH
 * als dynamisches `import('./X')`/`import("./X")` -- ein rein statisches Regex hätte ein
 * später eingeführtes `import('./X')` (z. B. für Code-Splitting) unsichtbar für diese
 * Prüfung gemacht. Beide Anführungszeichen-Varianten werden erfasst, da ESLint/Prettier
 * aktuell nur einfache durchsetzt, ein künftiger Stilwechsel die Prüfung aber nicht lautlos
 * aushebeln soll. Bekannte Grenze: nur flache `./X`-Pfade werden erkannt, ein Import aus einem
 * Unterordner wie `./internal/X` nicht -- aktuell legt keine Datei unter components/ui ihre
 * Geschwister-Importe in einem Unterordner ab, daher kein aktiver Verstoß, aber relevant,
 * falls sich das ändert.
 */
function extractLocalImports(fileContent: string): string[] {
  const imports: string[] = []
  const patterns = [/from\s+['"]\.\/([A-Za-z]+)['"]/g, /import\(\s*['"]\.\/([A-Za-z]+)['"]/g]
  for (const regex of patterns) {
    let match: RegExpExecArray | null
    while ((match = regex.exec(fileContent)) !== null) {
      imports.push(match[1])
    }
  }
  return imports
}

const storyFiles = fs
  .readdirSync(UI_DIR)
  .filter((file) => file.endsWith('.stories.tsx'))
  .sort()

describe('Grundbausteine/* Katalogprüfung: keine stillschweigenden Grundbaustein-Verbünde', () => {
  for (const storyFile of storyFiles) {
    const storyPath = path.join(UI_DIR, storyFile)
    const storyContent = fs.readFileSync(storyPath, 'utf8')
    const title = extractTitle(storyContent)

    if (!title || !title.startsWith('Grundbausteine/')) {
      continue
    }

    const componentName = storyFile.replace(/\.stories\.tsx$/, '')
    const componentPath = path.join(UI_DIR, `${componentName}.tsx`)

    if (!fs.existsSync(componentPath)) {
      // Keine eigene X.tsx -- das ist NUR für bewusst dokumentierte Dokumentations-Stories
      // erlaubt (DOCUMENTATION_ONLY_STORIES). Statt die Datei per it.skip unüberprüft zu
      // lassen, prüft dieser aktive, immer ausgeführte Test, dass genau das der Fall ist:
      // ein NEUER "Grundbausteine/*"-Story-Dateiname ohne eigene X.tsx, der NICHT bewusst
      // eingetragen ist (z. B. durch einen Tippfehler im Dateinamen oder eine vergessene
      // X.tsx), lässt diesen Test fehlschlagen statt stillschweigend unbemerkt zu bleiben.
      it(`${storyFile}: fehlende X.tsx ist eine bewusst dokumentierte Ausnahme`, () => {
        expect(
          DOCUMENTATION_ONLY_STORIES.has(componentName),
          `${storyFile} hat keine eigene ${componentName}.tsx und steht NICHT in DOCUMENTATION_ONLY_STORIES -- entweder eine ${componentName}.tsx anlegen oder die Datei hier bewusst mit Begründung eintragen`,
        ).toBe(true)
      })
      continue
    }

    it(`${storyFile}: Grundbaustein importiert keinen anderen, nicht ausgenommenen Grundbaustein`, () => {
      const componentContent = fs.readFileSync(componentPath, 'utf8')
      const internalsPath = path.join(UI_DIR, `${componentName}Internals.tsx`)
      const internalsContent = fs.existsSync(internalsPath) ? fs.readFileSync(internalsPath, 'utf8') : ''

      const importedNames = new Set([
        ...extractLocalImports(componentContent),
        ...extractLocalImports(internalsContent),
      ])

      const exceptions = new Set(EXCEPTIONS[componentName] ?? [])
      const violations = [...importedNames].filter((importedName) => {
        if (importedName === componentName || exceptions.has(importedName)) {
          return false
        }
        return fs.existsSync(path.join(UI_DIR, `${importedName}.stories.tsx`))
      })

      expect(violations, `${storyFile} importiert ungeprüft: ${violations.join(', ')}`).toEqual([])
    })
  }
})
