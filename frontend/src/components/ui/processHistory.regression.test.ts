import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Verhindert den Rückfall in Auftragsgeschichte statt fachlicher Erklärung (UAT-Storybook-
 * Review, Punkt A3): Story-Beschreibungen/-Titel und Kommentare in components/ui sollen den
 * jeweiligen Baustein erklären, nicht nacherzählen, in welcher Planungsrunde oder welchem
 * Auftrag er entstanden ist. Dieser Test liest die Quelldateien per `fs` (kein Rendering) und
 * schlägt bei jedem Treffer eines der verbotenen Auftrags-/Planungs-Verweismuster mit Datei und
 * Fundstelle fehl, statt das erst bei der nächsten Live-UAT von Hand wiederzufinden.
 */

const UI_DIR = path.resolve(process.cwd(), 'src/components/ui')
const SRC_DIR = path.resolve(process.cwd(), 'src')

/** Verbotene Auftrags-/Planungs-Verweismuster, jeweils mit Klartext-Erklärung fürs Fehlerbild. */
const FORBIDDEN_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  { name: 'UAT-Runde-Verweis', regex: /UAT-Runde\s*\d+/g },
  { name: 'Befund-Nummer', regex: /Befund\s*\d+/g },
  { name: 'Quick-Task-Verweis', regex: /Quick-Task\s*\d+|quick-\d{6}/g },
  { name: 'Plan-Dateiverweis', regex: /Plan\s*\d+-\d+/g },
  { name: 'Phasen-Nummer', regex: /Phase\s*\d+/g },
  { name: 'D-Kennung', regex: /\bD-\d{2}\b/g },
  { name: 'In-App-Showcase-Jargon', regex: /In-App-Showcase/g },
  { name: 'Live-UAT-follow-up-Verweis', regex: /Live-UAT[\s/-]*follow-up/gi },
  { name: 'Code-Review-finding-Verweis', regex: /code-review finding/gi },
]

/** Dateien, die das Muster selbst als GEPRÜFTEN Gegenstand enthalten (dieser Test hier), nicht
 *  als Rückfall -- sonst würde der Test sich selbst als Verstoss melden. */
const SELF_EXEMPT_FILES = new Set(['processHistory.regression.test.ts'])

function findHits(filePath: string, content: string, patterns: Array<{ name: string; regex: RegExp }> = FORBIDDEN_PATTERNS): string[] {
  const hits: string[] = []
  for (const { name, regex } of patterns) {
    const matches = content.match(regex)
    if (matches) {
      hits.push(`${name} (${matches.join(', ')})`)
    }
  }
  return hits
}

/**
 * Eigenes, bewusst KLEINERES Pattern-Set für den Phase-192-Pilot-Dateien-Rückfall-Wächter unten --
 * NICHT die obige, codebase-weite `FORBIDDEN_PATTERNS`-Liste wiederverwendet: deren `D-Kennung`/
 * `Quick-Task-Verweis`/generisches `Phase\s*\d+` sind eine codebase-weite Anforderungs-
 * Kennzeichnungskonvention, keine Phase-192-spezifische Planungsverweis-Leckage, und würden bei
 * einer Anwendung auf die vier Pilot-Verzeichnisse massenhaft auf unverwandte, bereits
 * abgeschlossene Phasen treffen (z. B. andere Requirement-IDs wie "D-11"/"D-16" in denselben
 * Dateien). Dieses Set erfasst ausschließlich die tatsächlich bei Phase 192 aufgetretenen
 * Planungsverweismuster.
 */
const PHASE_192_FORBIDDEN_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  { name: 'Befund-Nummer', regex: /Befund[- ]?\d+/g },
  { name: 'Befund-Buchstabe', regex: /Befund [A-Z]\b/g },
  { name: 'Runde-Nummer', regex: /Runde\s*\d+/g },
  { name: 'Plan-192-Dateiverweis', regex: /Plan\s*192-\d+/g },
  { name: '192-Planungsdateiverweis', regex: /192-\d+-(SUMMARY|PLAN|RESEARCH)/g },
  { name: 'Phase-192-Nummer', regex: /Phase\s*192\b/g },
]

/**
 * Die 46 Dateien, die Phase 192 tatsächlich geändert hat und die laut unabhängigem Review noch
 * Planungsverweise in Kommentaren/Testbeschreibungen enthielten (relativ zu `process.cwd()`, beim
 * Testlauf `frontend/`) -- eine explizite Allowlist statt eines Verzeichnis-Walks, mirror von
 * `compositeLayoutPurity.guard.test.ts`s `GUARDED_COMPOSITE_FILES`-Muster: ein Verzeichnis-Walk
 * über dieselben vier Ordner würde Dutzende Dateien anderer, bereits abgeschlossener Phasen
 * fälschlich mit erfassen (siehe Modulkommentar oben zu `PHASE_192_FORBIDDEN_PATTERNS`).
 */
const PHASE_192_PILOT_FILES: string[] = [
  '.storybook/mocks/animeFixtures.ts',
  'src/app/anime/[id]/AnimeDetailHero.module.css',
  'src/app/anime/[id]/AnimeDetailHero.tsx',
  'src/app/anime/[id]/AnimeDetailView.styles.ts',
  'src/app/anime/[id]/AnimeDetailView.test.tsx',
  'src/app/anime/[id]/AnimeDetailView.tsx',
  'src/app/anime/[id]/compositeLayoutPurity.guard.test.ts',
  'src/app/anime/[id]/detailStyleSystem.guard.test.ts',
  'src/app/anime/[id]/effectTokenPurity.guard.test.ts',
  'src/app/anime/[id]/gapPurposeNaming.guard.test.ts',
  'src/app/anime/[id]/page.episodes.module.css',
  'src/app/anime/[id]/page.module.css',
  'src/app/anime/[id]/page.performance.test.ts',
  'src/app/anime/[id]/page.test.tsx',
  'src/app/anime/[id]/page.tsx',
  'src/components/anime/AnimeEdgeNavigation.test.tsx',
  'src/components/anime/AnimeEdgeNavigation.tsx',
  'src/components/anime/AnimeMediaProvider.tsx',
  'src/components/anime/useAnimeEdgeNavigationHover.ts',
  'src/components/fansubs/EpisodeGlassCard.module.css',
  'src/components/fansubs/EpisodeGlassCard.test.tsx',
  'src/components/fansubs/EpisodeGlassCard.tsx',
  'src/components/fansubs/FansubGroupContext.test.tsx',
  'src/components/fansubs/FansubGroupPicker.module.css',
  'src/components/fansubs/FansubGroupPicker.test.tsx',
  'src/components/fansubs/FansubHeroSection.accessibility.test.ts',
  'src/components/fansubs/FansubVersionBrowser.test.tsx',
  'src/components/fansubs/FansubVersionBrowser.tsx',
  'src/components/fansubs/ReleasePreviewRow.module.css',
  'src/components/fansubs/ReleasePreviewRow.test.tsx',
  'src/components/fansubs/ReleasePreviewRow.tsx',
  'src/components/showcases/DesignTokensShowcase.module.css',
  'src/components/showcases/DesignTokensShowcase.tsx',
  'src/components/ui/Card.module.css',
  'src/components/ui/Cluster.test.tsx',
  'src/components/ui/FormField.test.tsx',
  'src/components/ui/Pagination.test.tsx',
  'src/components/ui/Stack.tsx',
  'src/components/watchlist/WatchlistAddButton.module.css',
  'src/components/watchlist/WatchlistAddButton.test.tsx',
  'src/components/watchlist/WatchlistAddButton.tsx',
  'src/lib/designTokens.test.ts',
  'src/lib/designTokens.ts',
  'src/styles/tokens/components.css',
  'src/styles/tokens/effects.css',
  'src/styles/tokens/layout.css',
]

function listFilesRecursive(dir: string, extensions: string[]): string[] {
  const results: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...listFilesRecursive(entryPath, extensions))
      continue
    }
    if (extensions.some((extension) => entry.name.endsWith(extension))) {
      results.push(entryPath)
    }
  }
  return results
}

describe('components/ui Kommentare: kein Rückfall in Auftrags-/Planungs-Historie', () => {
  const files = fs
    .readdirSync(UI_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => (name.endsWith('.tsx') || name.endsWith('.ts') || name.endsWith('.css')) && !name.endsWith('.test.ts') && !name.endsWith('.test.tsx'))
    .filter((name) => !SELF_EXEMPT_FILES.has(name))
    .sort()

  for (const file of files) {
    it(`${file}: enthält keinen Auftrags-/Planungs-Verweis`, () => {
      const content = fs.readFileSync(path.join(UI_DIR, file), 'utf8')
      const hits = findHits(file, content)
      expect(hits, `${file} enthält verbotene Auftrags-/Planungs-Verweise: ${hits.join('; ')}`).toEqual([])
    })
  }
})

describe('Story-Dateien: kein Rückfall in Auftrags-/Planungs-Historie in Titel/Beschreibung', () => {
  const storyFiles = listFilesRecursive(SRC_DIR, ['.stories.tsx']).sort()

  for (const storyPath of storyFiles) {
    const relativePath = path.relative(SRC_DIR, storyPath)

    it(`${relativePath}: Story-Datei enthält keinen Auftrags-/Planungs-Verweis`, () => {
      const content = fs.readFileSync(storyPath, 'utf8')
      const hits = findHits(relativePath, content)
      expect(hits, `${relativePath} enthält verbotene Auftrags-/Planungs-Verweise: ${hits.join('; ')}`).toEqual([])
    })
  }
})

describe('Phase-192-Pilot-Dateien: kein Rückfall in Befund-/Runden-/Plan-192-Verweise', () => {
  for (const relativePath of PHASE_192_PILOT_FILES) {
    it(`${relativePath}: enthält keinen Phase-192-Planungsverweis`, () => {
      const content = fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8')
      const hits = findHits(relativePath, content, PHASE_192_FORBIDDEN_PATTERNS)
      expect(hits, `${relativePath}: ${hits.join('; ')}`).toEqual([])
    })
  }
})
