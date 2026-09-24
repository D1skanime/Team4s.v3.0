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
})
