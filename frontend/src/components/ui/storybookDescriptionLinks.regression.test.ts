import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Verhindert den Rückfall in reinen Beschreibungs-TEXT ("Besteht aus: X, Y.") ohne echte
 * Storybook-Dokumentationslinks auf die verwendeten Bausteine. Dieser Test liest die realen
 * Story-Quelldateien per `fs` (kein Rendering, Muster analog zu catalogTaxonomy.test.ts) und
 * prüft zwei Dinge: (1) jede Datei mit einer "Besteht aus:"-Beschreibung ruft mindestens einmal
 * `storybookDocsLink(...)` auf -- reiner Text ohne Link lässt den Test fehlschlagen; (2) jeder
 * als erstes Argument übergebene Titel verweist auf einen Baustein, der TATSÄCHLICH als
 * `title: '...'` in irgendeiner `.stories.tsx`-Datei existiert -- ein Tippfehler oder ein
 * späterer Komponenten-Umbenennung würde sonst auf einen toten Link verweisen, ohne dass es
 * auffällt.
 */

const STORY_ROOTS = [
  'src/components/ui',
  'src/components/showcases',
  'src/components/admin',
  'src/components/fansubs',
].map((dir) => path.resolve(process.cwd(), dir))

function listStoryFilesRecursively(dir: string): string[] {
  if (!fs.existsSync(dir)) return []
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...listStoryFilesRecursively(fullPath))
    } else if (entry.name.endsWith('.stories.tsx') || entry.name.endsWith('.stories.ts')) {
      files.push(fullPath)
    }
  }
  return files
}

const storyFiles = STORY_ROOTS.flatMap((root) => listStoryFilesRecursively(root))

function extractTitles(content: string): string[] {
  return [...content.matchAll(/title:\s*'([^']+)'/g)].map((match) => match[1])
}

function extractStorybookDocsLinkTitles(content: string): string[] {
  return [...content.matchAll(/storybookDocsLink\(\s*'([^']+)'/g)].map((match) => match[1])
}

describe('"Besteht aus:"-Kompositionsbeschreibungen verlinken echte Storybook-Autodocs-Seiten', () => {
  const allRealTitles = new Set(storyFiles.flatMap((file) => extractTitles(fs.readFileSync(file, 'utf8'))))

  it('Vollständigkeitsnachweis: mindestens 20 Story-Dateien wurden tatsächlich eingelesen (Glob-Fehlkonfiguration würde sonst stillschweigend 0 Dateien prüfen)', () => {
    expect(storyFiles.length).toBeGreaterThan(20)
    expect(allRealTitles.size).toBeGreaterThan(20)
  })

  for (const file of storyFiles) {
    const relativePath = path.relative(process.cwd(), file)
    const content = fs.readFileSync(file, 'utf8')

    if (!content.includes('Besteht aus:')) continue

    it(`${relativePath}: "Besteht aus:"-Beschreibung nutzt storybookDocsLink() statt reinen Texts`, () => {
      expect(content, `${relativePath} enthält "Besteht aus:" ohne storybookDocsLink() -- Namen der verwendeten Bausteine müssen auf deren echte Storybook-Autodocs-Seite verlinken`).toMatch(
        /storybookDocsLink\(/,
      )
    })

    it(`${relativePath}: jeder verlinkte Titel existiert als echter title: in einer .stories.tsx-Datei`, () => {
      const linkedTitles = extractStorybookDocsLinkTitles(content)
      const missing = linkedTitles.filter((title) => !allRealTitles.has(title))
      expect(missing, `${relativePath} verlinkt nicht existierende Titel: ${missing.join(', ')}`).toEqual([])
    })
  }
})
