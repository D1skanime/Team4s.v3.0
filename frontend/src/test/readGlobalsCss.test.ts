import { describe, expect, it } from 'vitest'

import { readGlobalsCssResolved } from './readGlobalsCss'

describe('readGlobalsCssResolved', () => {
  it('löst die @import-Kette auf und liefert Token-Deklarationen aus mehreren Dateien als einen String', () => {
    const css = readGlobalsCssResolved()
    expect(css).not.toMatch(/@import\s+['"]/)
    // Je ein Token aus palette.css, layout.css, colors.css, fields.css, components.css, roleCatalog.css.
    expect(css).toMatch(/--accent-primary:\s*var\(--color-primary\);/)
    expect(css).toMatch(/--space-3:\s*12px;/)
    expect(css).toMatch(/--text-soft:\s*#625c56;/)
    expect(css).toMatch(/--field-radius:\s*8px;/)
    expect(css).toMatch(/--role-accent:\s*#596176;/)
  })
})
