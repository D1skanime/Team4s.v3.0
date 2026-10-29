import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Automatische Qualitaetssicherung gegen stillschweigende Grundbaustein-zu-Grundbaustein-
 * Verbuende (UAT-Befund 4/7): ein Primitiv unter der Storybook-Kategorie "Grundbausteine/*"
 * verspricht per Definition (siehe CLAUDE.md "Frontend-UI"), KEINE andere components/ui-
 * Komponente intern zu importieren -- komponiert es sichtbar mehrere benannte Grundbausteine,
 * gehoert es nach "Zusammengesetzte Bausteine/*" (wie bei den zehn in Befund 7 bereits
 * umsortierten Komponenten). Dieser Test liest NUR die realen Quelldateien per `fs` (kein
 * jsdom-Rendering, Muster analog zu roleCatalog.accessibility.test.ts) und schlaegt bei jedem
 * nicht dokumentierten Fall mit Datei+Import in der Fehlermeldung fehl, statt ein
 * stillschweigendes Abdriften der Taxonomie erst bei der naechsten Live-UAT zu entdecken.
 */

const UI_DIR = path.resolve(process.cwd(), 'src/components/ui')

/** Deklarierte Ausnahmen: ein Import gilt trotz eigener X.stories.tsx NICHT als Verstoss, wenn
 *  er hier mit einer fachlichen Begruendung gelistet ist. */
const EXCEPTIONS: Record<string, string[]> = {
  // Spinner ist ausschliesslich ein internes Implementierungsdetail von Buttons Lade-Zustand,
  // kein sichtbarer, eigenstaendig komponierter Baustein-Verbund -- anders als z. B.
  // Modal+DialogHeader+IconButton (die deshalb bereits unter "Zusammengesetzte Bausteine"
  // stehen).
  Button: ['Spinner'],
  // Heading/Text sind bewusst geteilte, eigene Typografie-Grundbausteine (level/size bzw.
  // variant-API) -- keine zufaellige Kopplung, sondern die gezielte interne Migration dieser
  // drei Header-Bausteine weg von eigenem h1/h2/h3/p auf einen gemeinsamen Baustein.
  PageHeader: ['Heading', 'Text'],
  SectionHeader: ['Heading', 'Text'],
  Card: ['Heading', 'Text'],
}

function extractTitle(fileContent: string): string | null {
  const match = fileContent.match(/title:\s*'([^']+)'/)
  return match ? match[1] : null
}

/**
 * Erfasst lokale Geschwister-Importe sowohl als statisches `from './X'`/`from "./X"` ALS AUCH
 * als dynamisches `import('./X')`/`import("./X")` -- ein rein statisches Regex haette ein
 * spaeter eingefuehrtes `import('./X')` (z. B. fuer Code-Splitting) unsichtbar fuer diese
 * Pruefung gemacht. Beide Anfuehrungszeichen-Varianten werden erfasst, da ESLint/Prettier
 * aktuell nur einfache durchsetzt, ein kuenftiger Stilwechsel die Pruefung aber nicht lautlos
 * aushebeln soll. Bekannte Grenze: nur flache `./X`-Pfade werden erkannt, ein Import aus einem
 * Unterordner wie `./internal/X` nicht -- aktuell legt keine Datei unter components/ui ihre
 * Geschwister-Importe in einem Unterordner ab, daher kein aktiver Verstoss, aber relevant,
 * falls sich das aendert.
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

describe('Grundbausteine/* Katalogpruefung: keine stillschweigenden Grundbaustein-Verbuende', () => {
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
      // Reine Dokumentations-Story ohne eigene Produktkomponente (z. B. eine
      // Typografie-Uebersichtsseite, siehe TypographyOverview.stories.tsx) -- es gibt keine
      // X.tsx, die auf stillschweigende Importe geprueft werden koennte. Bewusst als it.skip
      // sichtbar in der Testausgabe, statt die Datei einfach stillschweigend auszulassen oder
      // per fs.readFileSync in einen ENOENT-Crash zu laufen.
      it.skip(`${storyFile}: hat keine eigene X.tsx -- Katalogpruefung bewusst uebersprungen`, () => {})
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

      expect(violations, `${storyFile} importiert ungeprueft: ${violations.join(', ')}`).toEqual([])
    })
  }
})
