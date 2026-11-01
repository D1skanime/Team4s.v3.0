import fs from 'node:fs'
import path from 'node:path'

/**
 * Liest `src/styles/globals.css` UND löst dessen `@import './...'`-Kette rekursiv auf, damit
 * Tests weiterhin den vollständigen, effektiven `:root`-Token-Text als EINEN String bekommen --
 * unabhängig davon, dass die Tokens fachlich auf mehrere Dateien unter `src/styles/` bzw.
 * `src/styles/tokens/` verteilt sind (450-Zeilen-Regel). Nur relative `@import './x.css'`-Pfade
 * werden aufgelöst (das einzige in diesem Projekt genutzte Muster) -- ein externer/URL-Import
 * würde unverändert als Text im Ergebnis stehen bleiben, kommt in diesem Repo aber nicht vor.
 */
export function readGlobalsCssResolved(): string {
  const stylesDir = path.resolve(process.cwd(), 'src/styles')
  const entryFile = path.join(stylesDir, 'globals.css')

  const seen = new Set<string>()
  function resolve(filePath: string): string {
    if (seen.has(filePath)) return ''
    seen.add(filePath)
    const content = fs.readFileSync(filePath, 'utf8')
    const dir = path.dirname(filePath)
    return content.replace(/@import\s+['"](\.\/[^'"]+)['"]\s*;/g, (_match, importPath: string) => {
      return resolve(path.join(dir, importPath))
    })
  }

  return resolve(entryFile)
}
