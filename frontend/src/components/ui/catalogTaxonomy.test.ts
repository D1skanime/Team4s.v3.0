import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Automatische Qualitätssicherung gegen stillschweigende Grundbaustein-zu-Grundbaustein-
 * Verbünde: ein Primitiv unter der Storybook-Kategorie "Grundbausteine/*" verspricht per
 * Definition (siehe CLAUDE.md "Frontend-UI"), KEINE andere components/ui-Komponente intern zu
 * importieren -- komponiert es sichtbar mehrere benannte Grundbausteine, gehört es nach
 * "Zusammengesetzte Bausteine/*". Dieser Test liest NUR die realen Quelldateien per `fs` (kein
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
  // Gleiche Begründung wie bei Button oben: Spinner ist nur ein internes Implementierungsdetail
  // von IconButtons loading-Zustand (ersetzt das übergebene icon durch einen Lade-Kreisel), kein
  // sichtbarer, eigenständig komponierter Baustein-Verbund.
  IconButton: ['Spinner'],
  // ResponsiveImage ist nur die interne Bildquelle (entscheidet lediglich, ob optimiert oder
  // unoptimiert geladen wird); VisuallyHidden liefert nur den vorlesbaren Namen neben dem Bild/
  // den Initialen. Beides sind interne Implementierungsdetails der EINEN Avatar-Fläche, kein vom
  // Aufrufer sichtbar komponierter Baustein-Verbund.
  Avatar: ['ResponsiveImage', 'VisuallyHidden'],
  // Card bleibt bewusst ein Grundbaustein: seine Grundfläche (Rahmen/Hintergrund/Schatten) steht
  // für sich, Titel/Beschreibung sind nur ein OPTIONALER Teil (title/description-Props). Dass
  // dieser optionale Titel intern Heading/Text nutzt, ist dieselbe Art geteilter Typografie-
  // Grundbaustein-Wiederverwendung wie ein Button, der intern ein Icon aus lucide-react
  // einbindet -- keine sichtbar KOMPONIERTE Kombination mehrerer benannter Bausteine, die ein
  // Aufrufer selbst zusammensetzt (anders als bei PageHeader/SectionHeader unten, die deshalb
  // nach "Zusammengesetzte Bausteine" verschoben wurden).
  Card: ['Heading', 'Text'],
  // Table bleibt bewusst ein Grundbaustein: die <table>/<thead>/<tbody>/<tr>/<td>-Familie ist
  // eine reine Daten-Tabellen-Grundstruktur. TableEmptyState ist nur EIN optionaler Hilfs-Export
  // für den Sonderfall "keine Zeilen" innerhalb dieser Grundstruktur (StatusIcon/Heading/Text
  // für dieselbe Optik wie EmptyState) -- kein vom Aufrufer sichtbar komponierter Baustein-
  // Verbund, den die Tabelle selbst erzwingt.
  Table: ['Heading', 'StatusIcon', 'Text'],
  // VisuallyHidden liefert nur den zusätzlichen, nur für Screenreader vorhandenen Pflichtfeld-
  // Hinweistext neben dem sichtbaren Sternchen -- ein internes Implementierungsdetail der EINEN
  // Label-Fläche, kein vom Aufrufer sichtbar komponierter Baustein-Verbund (gleiche Begründung
  // wie bei Avatar oben).
  Label: ['VisuallyHidden'],
  // DisclosureIndicator ist nur das interne Öffner-Symbol (Chevron/Pfeil), kein vom Aufrufer
  // sichtbar komponierter Baustein-Verbund -- DisclosureTrigger bleibt deshalb trotz dieses
  // Imports ein Grundbaustein (gleiche Begründung wie bei Avatar/Label oben).
  DisclosureTrigger: ['DisclosureIndicator'],
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

/**
 * Taxonomie-Regel "Im Einsatz/*": „Im Einsatz = nur vollständige Seiten oder vollständige
 * Abläufe" -- keine isolierten Einzelbaustein-Demos mehr. Anders als die Grundbaustein-Prüfung
 * oben lässt sich "ist das eine vollständige Seite" nicht allein aus Importen ableiten --
 * deshalb arbeitet dieser Block mit einer explizit gepflegten Allowlist: JEDE "Im Einsatz/*"-
 * Story irgendwo im Repo MUSS hier mit Datei UND Titel eingetragen sein, sonst schlägt der Test
 * fehl. Das verhindert genau das Szenario, das diese Prüfung ersetzt (eine künftige, isolierte
 * Einzelbaustein-Story landet stillschweigend unter "Im Einsatz", ohne dass irgendein
 * automatisierter Check das bemerkt) -- eine neue Story in dieser Kategorie erzwingt eine
 * bewusste, im Diff sichtbare Änderung an genau dieser Liste.
 */
const SRC_DIR = path.resolve(process.cwd(), 'src')

/** Rekursiver *.stories.tsx-Scan über den gesamten src-Baum (node_modules/.next o. ä. existieren
 *  unter src/ ohnehin nicht) -- "Im Einsatz/*"-Stories liegen anders als Grundbausteine/
 *  Zusammengesetzte Bausteine NICHT nur unter components/ui, sondern auch unter
 *  components/showcases, components/fansubs und app/**. */
function findStoryFilesRecursively(dir: string): string[] {
  const results: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...findStoryFilesRecursively(entryPath))
    } else if (entry.isFile() && entry.name.endsWith('.stories.tsx')) {
      results.push(entryPath)
    }
  }
  return results
}

/**
 * Jeder Eintrag MUSS entweder (a) eine echte vollständige Seite/einen echten vollständigen
 * Ablauf zeigen (aktuell beide Pilot-Stories unter `app/anime/`, Server/Ansicht-Split-Muster
 * aus Quick-Task 261102-cb2) oder (b) als bewusst nicht in dieser Runde bereinigte, vorbestehende
 * Ausnahme mit Begründung gekennzeichnet sein -- KEIN neuer Eintrag darf kommentarlos ergänzt
 * werden.
 */
const IM_EINSATZ_ALLOWLIST: Record<string, string> = {
  // Vorbestehend, nicht Teil der Bereinigungsrunden, die diese Taxonomie-Regel eingeführt haben
  // (261102-cb2 benannte nur die migrierten Einzel-Baustein-Showcases explizit) -- zeigen jeweils
  // eine Galerie/Oberflächen-Zusammenstellung, keine einzelne vollständige Seite im Sinne dieser
  // Regel. Bewusst als Kandidaten für einen künftigen Seiten-Durchgang stehen gelassen statt sie
  // unbegründet hier "freizusprechen" oder ungefragt umzukategorisieren.
  'components/showcases/AchievementBadgeShowcase.stories.tsx': 'Im Einsatz/Erfolgsbadge-Galerie',
  'components/showcases/PublicFansubSurfacesShowcase.stories.tsx': 'Im Einsatz/Öffentliche Fansub-Oberflächen',
  'components/showcases/PublicReleaseSurfacesShowcase.stories.tsx': 'Im Einsatz/Öffentliche Release-Oberflächen',
  // AppShell ist der globale Seitenrahmen (Navigation + Slide-over-Drawer), der auf JEDER
  // authentifizierten Seite rendert -- fachlich näher an einem vollständigen Ablauf als an
  // einem isolierten Einzelbaustein, aber kein Server/Ansicht-Split-Pilot wie die beiden
  // Anime-Stories unten. Vorbestehend, nicht in dieser Runde reklassifiziert.
  'components/showcases/AppShellDrawerDemoSection.stories.tsx': 'Im Einsatz/AppShell mit Slide-over-Drawer',
  // Echte vollständige Seiten (Server/Ansicht-Split-Pilot, Quick-Task 261102-cb2/261102-hlg):
  // die Storybook-Komponente IST dieselbe Darstellungskomponente, die die echte Next.js-Route
  // rendert (AnimeListContent/AnimeDetailContent reichen nur noch Daten als Props durch).
  'app/anime/AnimeListView.stories.tsx': 'Im Einsatz/Öffentlich/Anime-Liste',
  'app/anime/[id]/AnimeDetailView.stories.tsx': 'Im Einsatz/Öffentlich/Anime-Detail',
}

describe('Im Einsatz/* Katalogprüfung: nur allowlisted Stories, keine stillschweigend neuen Einzelbaustein-Demos', () => {
  const allStoryFiles = findStoryFilesRecursively(SRC_DIR)
  const imEinsatzFiles = allStoryFiles.filter((absPath) => {
    const content = fs.readFileSync(absPath, 'utf8')
    const title = extractTitle(content)
    return title?.startsWith('Im Einsatz/')
  })

  it('jede gefundene "Im Einsatz/*"-Story steht mit passendem Titel in der Allowlist', () => {
    const unlisted = imEinsatzFiles
      .map((absPath) => {
        const relPath = path.relative(SRC_DIR, absPath).split(path.sep).join('/')
        const title = extractTitle(fs.readFileSync(absPath, 'utf8'))
        return { relPath, title }
      })
      .filter(({ relPath, title }) => IM_EINSATZ_ALLOWLIST[relPath] !== title)

    expect(
      unlisted,
      `Neue oder umbenannte "Im Einsatz/*"-Stories ohne Allowlist-Eintrag gefunden: ${JSON.stringify(unlisted)}. ` +
        'Entweder gehört die Story in "Grundbausteine/*"/"Zusammengesetzte Bausteine/*" (zeigt nur einen ' +
        'Baustein, keine vollständige Seite/keinen vollständigen Ablauf), oder sie ist bewusst eine neue ' +
        'vollständige Seite/ein neuer vollständiger Ablauf und muss mit Begründung in IM_EINSATZ_ALLOWLIST ' +
        '(catalogTaxonomy.test.ts) ergänzt werden.',
    ).toEqual([])
  })

  it('jeder Allowlist-Eintrag verweist auf eine tatsächlich existierende Datei mit exakt diesem Titel', () => {
    const stale = Object.entries(IM_EINSATZ_ALLOWLIST).filter(([relPath, expectedTitle]) => {
      const absPath = path.join(SRC_DIR, relPath)
      if (!fs.existsSync(absPath)) return true
      return extractTitle(fs.readFileSync(absPath, 'utf8')) !== expectedTitle
    })

    expect(
      stale,
      `Allowlist-Einträge ohne passende Datei/Titel (gelöscht, verschoben oder umbenannt): ${JSON.stringify(stale)} -- IM_EINSATZ_ALLOWLIST nachführen.`,
    ).toEqual([])
  })
})
