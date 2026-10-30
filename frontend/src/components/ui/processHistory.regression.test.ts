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
]

/** Dateien, die das Muster selbst als GEPRÜFTEN Gegenstand enthalten (dieser Test hier), nicht
 *  als Rückfall -- sonst würde der Test sich selbst als Verstoss melden. */
const SELF_EXEMPT_FILES = new Set(['processHistory.regression.test.ts'])

function findHits(filePath: string, content: string): string[] {
  const hits: string[] = []
  for (const { name, regex } of FORBIDDEN_PATTERNS) {
    const matches = content.match(regex)
    if (matches) {
      hits.push(`${name} (${matches.join(', ')})`)
    }
  }
  return hits
}

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
