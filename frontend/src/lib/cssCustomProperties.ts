// Pure static-analysis scanner for CSS custom-property ("--x") definitions and usages.
// No file I/O in this module -- callers read files and pass in a Map<filename, contents> so
// tests can use in-memory fixtures and the guard test can additionally build a Map from the
// real frontend/src tree. See cssCustomProperties.guard.test.ts for both usages.

export interface CustomPropertyUsage {
  file: string
  line: number
  name: string // e.g. "--color-text-muted"
  hasFallback: boolean
  fallbackVarName?: string // set only when the fallback argument is itself a var(--x) reference
}

// Declaration-position regex: matches "--name" only where it is not itself preceded by an
// identifier character (avoids matching inside a longer token) and is followed by optional
// whitespace and a colon -- i.e. a genuine CSS custom-property declaration such as
// ":root { --foo: red; }" or ".bar { --scoped-x: blue; }".
const CSS_DECLARATION_REGEXP = /(?<![a-zA-Z0-9_-])--[a-zA-Z0-9-]+(?=\s*:)/g

// TSX/TS inline-style object literal key: style={{ '--inline-y': value }} or "--inline-y": value.
const TSX_INLINE_DECLARATION_REGEXP = /['"](--[a-zA-Z0-9-]+)['"]\s*:/g

// var(--name) / var(--name, fallback) usage. A naive single generic-fallback-capture regex
// cannot correctly balance one level of nested var(...) fallbacks (e.g. "var(--c, var(--d))") --
// a non-greedy ".+?" capture stops as soon as it sees ANY upcoming ")", which is the INNER var's
// own closing paren, one character too early, leaving the outer closing paren dangling unmatched.
// Instead, the nested-var-fallback shape is matched explicitly as its own alternative (tried
// first), with the plain/literal-fallback shape as the fallback alternative -- avoiding
// paren-balancing entirely.
const VAR_USAGE_REGEXP =
  /var\(\s*(?<nestedName>--[a-zA-Z0-9-]+)\s*,\s*var\(\s*(?<nestedFallbackName>--[a-zA-Z0-9-]+)\s*\)\s*\)|var\(\s*(?<simpleName>--[a-zA-Z0-9-]+)\s*(?:,\s*(?<simpleFallback>[^()]*))?\s*\)/g

function isTsLikeFile(fileName: string): boolean {
  return fileName.endsWith('.ts') || fileName.endsWith('.tsx')
}

function isCssLikeFile(fileName: string): boolean {
  return fileName.endsWith('.css')
}

/**
 * Scans declaration-position custom properties only, across ALL provided files -- both
 * top-level/scoped CSS declarations (":root { --x: ... }", ".foo { --x: ... }") in .css files,
 * and TSX/TS inline-style object literal keys ("style={{ '--x': value }}") in .ts/.tsx files.
 */
export function extractDefinedProperties(fileContents: Map<string, string>): Set<string> {
  const defined = new Set<string>()

  for (const [fileName, contents] of fileContents) {
    if (isCssLikeFile(fileName)) {
      for (const match of contents.matchAll(CSS_DECLARATION_REGEXP)) {
        defined.add(match[0])
      }
    }

    if (isTsLikeFile(fileName)) {
      for (const match of contents.matchAll(TSX_INLINE_DECLARATION_REGEXP)) {
        defined.add(match[1])
      }
    }
  }

  return defined
}

/**
 * Scans every var(--name) / var(--name, fallback) occurrence, per file, with 1-based line
 * numbers. A fallback that is itself a bare var(--other-name) reference (no further nested
 * fallback) populates fallbackVarName so callers can re-check it against the defined set.
 */
export function extractVarUsages(fileContents: Map<string, string>): CustomPropertyUsage[] {
  const usages: CustomPropertyUsage[] = []

  for (const [fileName, contents] of fileContents) {
    const lines = contents.split('\n')

    lines.forEach((lineText, index) => {
      for (const match of lineText.matchAll(VAR_USAGE_REGEXP)) {
        const groups = match.groups ?? {}

        if (groups.nestedName) {
          usages.push({
            file: fileName,
            line: index + 1,
            name: groups.nestedName,
            hasFallback: true,
            fallbackVarName: groups.nestedFallbackName,
          })
          continue
        }

        usages.push({
          file: fileName,
          line: index + 1,
          name: groups.simpleName!,
          hasFallback: groups.simpleFallback !== undefined,
          fallbackVarName: undefined,
        })
      }
    })
  }

  return usages
}

/**
 * A usage is dead if:
 *   (a) it has no fallback and its name is not in the defined set, OR
 *   (b) it has a fallback whose fallbackVarName is itself set and not in the defined set (a
 *       one-level nested var() fallback that itself resolves to nothing -- the
 *       Breadcrumbs.module.css class of bug).
 * A usage with a literal (non-var) fallback is never dead, regardless of whether its own name is
 * defined -- a literal fallback always protects the declaration. A usage with a nested var()
 * fallback that IS defined is never dead either.
 */
export function findDeadReferences(
  defined: Set<string>,
  usages: CustomPropertyUsage[],
): CustomPropertyUsage[] {
  return usages.filter((usage) => {
    if (!usage.hasFallback) {
      return !defined.has(usage.name)
    }

    if (usage.fallbackVarName) {
      return !defined.has(usage.fallbackVarName)
    }

    return false
  })
}
