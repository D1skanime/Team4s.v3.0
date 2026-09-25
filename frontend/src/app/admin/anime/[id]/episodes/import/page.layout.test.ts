// @vitest-environment node

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(path.join(__dirname, 'page.module.css'), 'utf8')

describe('mapping row layout CSS (GAP-09, 167-UAT.md)', () => {
  it('defines the three mapping row regions', () => {
    expect(css).toMatch(/\.mappingRowInfo\s*\{/)
    expect(css).toMatch(/\.mappingRowFields\s*\{/)
    expect(css).toMatch(/\.mappingRowActions\s*\{/)
  })

  it('stacks .mappingRow into a single column within the <=980px breakpoint', () => {
    const start = css.indexOf('@media (max-width: 980px)')
    expect(start).toBeGreaterThan(-1)
    const rest = css.slice(start)
    const end = rest.indexOf('@media', 10)
    const block = end === -1 ? rest : rest.slice(0, end)

    const rowRule = block.match(/\.mappingRow\s*\{([^}]*)\}/)
    expect(rowRule).not.toBeNull()
    expect(rowRule![1]).toMatch(/grid-template-columns:\s*1fr/)
  })

  it('keeps workbench actions right-aligned and title controls compact', () => {
    const actionsRule = css.match(/\.workbenchActions\s*\{([^}]*)\}/)
    expect(actionsRule?.[1]).toMatch(/justify-content:\s*flex-end/)
    expect(css).toMatch(/\.episodeTitleLanguage\s*\{/)
    expect(css).toMatch(/\.episodeTitleInput\s*\{[^}]*min-height:\s*40px/)
  })

  it('defines a five-column mapping header aligned with mapping rows', () => {
    expect(css).toMatch(/\.mappingColumnHeader\s*\{/)
    expect(css).toMatch(/\.mappingRowFields\s*\{[^}]*display:\s*contents/)
    expect(css).toMatch(/grid-template-columns:\s*minmax\(220px, 1\.3fr\).*110px 110px minmax\(130px, auto\)/)
  })

  it('keeps the group controls together and close to the filename column', () => {
    expect(css).toMatch(/\.groupInputRow\s*\{[^}]*grid-template-columns:\s*minmax\(150px, 1fr\) auto auto auto/)
    expect(css).toMatch(/\.mappingRow\s*\{[^}]*column-gap:\s*12px/)
  })

  it('keeps the episode title left-aligned', () => {
    expect(css).toMatch(/\.episodeTitleInput\s*\{[^}]*text-align:\s*left/)
  })
})
