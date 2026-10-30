import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Automatische Qualitätssicherung gegen englische ODER unlesbar zusammengeschriebene sichtbare
 * Story-Namen/-Titel/-Inhalte (Codex-Review Runde 2 von 2 + Live-UAT-Nachbesserung, quick-
 * 261029-rnd): der Auftrag verlangt durchgehend deutsche, lesbare sichtbare Story-Namen, Titel
 * und gerenderte Texte in Storybook. Vier konkrete, bereits aufgetretene Fehlermuster werden
 * hier dauerhaft als Regression erfasst, statt erst bei der nächsten Review-/UAT-Runde erneut
 * aufzufallen:
 *
 * 1. Eine Story ohne `name:`-Override zeigt den rohen Export-Bezeichner als sichtbaren Namen
 *    (z. B. `export const Disabled` ohne Override zeigt "Disabled" in der Sidebar).
 * 2. Ein `name:`-Override oder ein gerendertes Props-Literal verwendet selbst ein englisches
 *    Wort (z. B. `name: 'WithActions'` oder `children: 'Success'`).
 * 3. Ein `name:`-Override (oder der ungenutzte Export-Bezeichner) ist zwar deutsch, aber ohne
 *    Leerzeichen aus mehreren Wörtern zusammengeschrieben (CamelCase, z. B. `name: 'LangerInhalt'`
 *    statt `'Langer Inhalt'`) -- für Menschen in der Sidebar schwer lesbar.
 * 4. Das `title:`-Feld selbst (zweites Pfadsegment nach der Kategorie, z. B. "AccordionShowcase"
 *    in "Im Einsatz/AccordionShowcase") ist englisch und/oder unlesbar zusammengeschrieben.
 *    Diese Prüfung lief bislang NUR über `src/components/ui` -- `components/showcases` und
 *    `components/fansubs` blieben unerfasst (Codex-Review Runde 2 von 2).
 *
 * Bewusste Grenze (analog zu catalogTaxonomy.test.ts): dies ist eine Textmuster-Prüfung per
 * `fs`, kein jsdom-Rendering -- sie erfasst nur den `name:`-Override, den Export-Bezeichner, das
 * `title:`-Label und einzelne, exakt großgeschriebene String-Literale je Story-Block, NICHT
 * jede beliebige zusammengesetzte JSX-Ausdruck-Struktur. Echte code-seitige Enum-Werte
 * (`variant: 'success'`) bleiben unberührt, da sie im Code-Stil dieses Repos durchgehend
 * kleingeschrieben sind -- nur die GROSSGESCHRIEBENE Form eines Wortes als eigenständiges
 * String-Literal gilt als Verstoß.
 *
 * Bewusste Ausnahme für `components/ui`-Titel-Labels: dort IST das Label per Projektkonvention
 * (siehe catalogTaxonomy.test.ts) immer der bloße, reale Komponentenname (z. B. "Button",
 * "AvatarStack", "LoadingState") -- ein etablierter Eigenname/Katalogbegriff, kein vergessen
 * zusammengeschriebener Satz. Englische Wortbestandteile oder CamelCase in diesem Eigennamen
 * sind daher dort kein Verstoß. `components/showcases` und `components/fansubs` haben KEINE
 * vergleichbare Eigennamen-Konvention -- ihre Titel-Labels sind freier, beschreibender Text und
 * unterliegen deshalb denselben Lesbarkeitsregeln wie Story-Namen.
 */

const COMPONENT_ROOT = path.resolve(process.cwd(), 'src/components')
const UI_DIR = path.join(COMPONENT_ROOT, 'ui')
const STORY_DIRS = [UI_DIR, path.join(COMPONENT_ROOT, 'showcases'), path.join(COMPONENT_ROOT, 'fansubs')]

/** Englische Wörter, die wiederholt als sichtbarer Story-Name aufgetaucht sind. Wortgrenzen-
 *  Abgleich, ohne Berücksichtigung von Groß-/Kleinschreibung. */
const ENGLISH_DISPLAY_WORDS = [
  'success', 'warning', 'danger', 'muted', 'primary', 'secondary', 'ghost', 'subtle',
  'loading', 'disabled', 'small', 'large', 'idle', 'uploading', 'processing', 'ready',
  'failed', 'default', 'elevated', 'interactive', 'compact', 'section', 'flat', 'nested',
  'invalid', 'floating', 'hairline', 'medium', 'strong', 'selectable', 'previous',
  'actions', 'description', 'items', 'save', 'pending', 'persisted', 'retry',
]

/** Bewusste Ausnahmen: etablierte technische/fachliche Begriffe, die trotz englischer Wortform
 *  als sichtbarer Name bleiben (Layout-Fachbegriffe wie "Leading/Trailing" oder Domänenbegriffe
 *  wie "Artwork"), kein vergessener Übersetzungsfall. */
const DISPLAY_NAME_ALLOWLIST = new Set([
  'NurLeading', // Toolbar/ActionBar-Prop heisst selbst `leading` -- Layout-Fachbegriff, kein Adjektiv
  'NurTrailing', // s.o., Pendant `trailing`
  'OhneArtwork', // "Artwork" ist in diesem Medien-/Fansub-Kontext ein etablierter Fachbegriff
])

/** Erkennt einen sichtbaren Namen, der aus mehreren grossgeschriebenen Wortteilen ohne
 *  Leerzeichen besteht (z. B. "LangerInhalt") -- lesbar wäre "Langer Inhalt". Technische,
 *  bewusst wortlose Kürzel wie "H1"-"H4" (Ziffer statt zweitem Grossbuchstaben) fallen NICHT
 *  darunter. */
function isUnspacedCamelCase(text: string): boolean {
  return /^[A-Z][a-z0-9]+(?:[A-Z][a-zA-Z0-9]*)+$/.test(text)
}

/** Grossgeschriebene String-Literale, die wiederholt als vergessener englischer Props-Inhalt
 *  (z. B. `children: 'Success'`) aufgetaucht sind. */
const ENGLISH_CONTENT_LITERALS = new Set(
  ENGLISH_DISPLAY_WORDS
    .filter((word) => !['actions', 'description', 'items', 'section'].includes(word))
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1)),
)

function extractStoryBlocks(fileContent: string): { identifier: string; block: string }[] {
  const blocks: { identifier: string; block: string }[] = []
  const regex = /export const ([A-Za-z0-9]+): Story = \{/g
  const matches = [...fileContent.matchAll(regex)]

  for (let i = 0; i < matches.length; i += 1) {
    const match = matches[i]
    const start = match.index ?? 0
    const end = i + 1 < matches.length ? matches[i + 1].index : fileContent.length
    blocks.push({ identifier: match[1], block: fileContent.slice(start, end) })
  }

  return blocks
}

function extractTitle(fileContent: string): string | null {
  const match = fileContent.match(/title:\s*'([^']+)'/)
  return match ? match[1] : null
}

function containsEnglishWord(text: string): string | null {
  for (const word of ENGLISH_DISPLAY_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, 'i')
    if (regex.test(text)) {
      return word
    }
  }
  return null
}

describe('Storybook-Texte sind durchgehend deutsch (sichtbare Story-Namen, Titel und Props-Inhalte)', () => {
  for (const dir of STORY_DIRS) {
    const dirLabel = path.relative(COMPONENT_ROOT, dir)
    const storyFiles = fs
      .readdirSync(dir)
      .filter((file) => file.endsWith('.stories.tsx'))
      .sort()

    for (const storyFile of storyFiles) {
      const storyPath = path.join(dir, storyFile)
      const storyContent = fs.readFileSync(storyPath, 'utf8')
      const blocks = extractStoryBlocks(storyContent)

      for (const { identifier, block } of blocks) {
        if (DISPLAY_NAME_ALLOWLIST.has(identifier)) {
          continue
        }

        it(`${dirLabel}/${storyFile} / ${identifier}: sichtbarer Story-Name ist deutsch`, () => {
          const nameOverrideMatch = block.match(/name:\s*'([^']*)'/)
          const effectiveDisplayName = nameOverrideMatch ? nameOverrideMatch[1] : identifier
          const violation = containsEnglishWord(effectiveDisplayName)

          expect(
            violation,
            `${dirLabel}/${storyFile} / ${identifier}: sichtbarer Name "${effectiveDisplayName}" enthält das englische Wort "${violation}" -- deutsches name:-Override ergänzen oder korrigieren`,
          ).toBeNull()
        })

        it(`${dirLabel}/${storyFile} / ${identifier}: keine grossgeschriebenen englischen String-Literale in Props`, () => {
          const literalMatches = [...block.matchAll(/'([A-Za-z]+)'/g)].map((match) => match[1])
          const violations = literalMatches.filter((literal) => ENGLISH_CONTENT_LITERALS.has(literal))

          expect(
            violations,
            `${dirLabel}/${storyFile} / ${identifier}: enthält grossgeschriebene englische String-Literale: ${violations.join(', ')} -- vermutlich vergessener englischer Props-/Children-Inhalt`,
          ).toEqual([])
        })

        it(`${dirLabel}/${storyFile} / ${identifier}: sichtbarer Story-Name ist lesbar (kein CamelCase ohne Leerzeichen)`, () => {
          const nameOverrideMatch = block.match(/name:\s*'([^']*)'/)
          const effectiveDisplayName = nameOverrideMatch ? nameOverrideMatch[1] : identifier

          expect(
            isUnspacedCamelCase(effectiveDisplayName),
            `${dirLabel}/${storyFile} / ${identifier}: sichtbarer Name "${effectiveDisplayName}" ist mehrwortiges CamelCase ohne Leerzeichen -- deutsches name:-Override mit Leerzeichen/Satzzeichen ergänzen (z. B. "Langer Inhalt" statt "LangerInhalt")`,
          ).toBe(false)
        })
      }

      it(`${dirLabel}/${storyFile}: Storybook-Titel-Label ist deutsch`, () => {
        const title = extractTitle(storyContent)
        expect(title, `${dirLabel}/${storyFile} must declare a title`).not.toBeNull()
        const slashIndex = title!.indexOf('/')
        const label = slashIndex === -1 ? title! : title!.slice(slashIndex + 1)

        // components/ui: das Label ist per Konvention der reale, katalogisierte Komponentenname
        // (z. B. "LoadingState") -- ein Eigenname, kein freier Beschreibungstext. Englische
        // Wortbestandteile darin sind dort kein Verstoss (siehe Datei-Kommentar oben).
        if (dir === UI_DIR) {
          return
        }

        const violation = containsEnglishWord(label)
        expect(
          violation,
          `${dirLabel}/${storyFile}: Titel-Label "${label}" enthält das englische Wort "${violation}" -- deutsches title-Label verwenden`,
        ).toBeNull()
      })

      it(`${dirLabel}/${storyFile}: Storybook-Titel-Label ist lesbar (kein CamelCase ohne Leerzeichen)`, () => {
        const title = extractTitle(storyContent)
        expect(title, `${dirLabel}/${storyFile} must declare a title`).not.toBeNull()
        const slashIndex = title!.indexOf('/')
        const label = slashIndex === -1 ? title! : title!.slice(slashIndex + 1)

        // components/ui: das Label ist der reale Komponentenname -- strukturell bereits durch
        // catalogTaxonomy.test.ts an die tatsächliche Datei gebunden, deshalb hier ausgenommen
        // (ein "AvatarStack" ist ein etablierter Eigenname, kein vergessen zusammengeschriebener
        // Satz).
        if (dir === UI_DIR) {
          return
        }

        expect(
          isUnspacedCamelCase(label),
          `${dirLabel}/${storyFile}: Titel-Label "${label}" ist mehrwortiges CamelCase ohne Leerzeichen -- lesbares deutsches Label mit Leerzeichen/Bindestrich verwenden (z. B. "Switch-Beispiele" statt "SwitchShowcase")`,
        ).toBe(false)
      })
    }
  }
})
