// @vitest-environment jsdom

import fs from 'node:fs'
import path from 'node:path'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Button } from './Button'

describe('Button', () => {
  it('reicht aria-current/aria-pressed unverändert an das native Element durch', () => {
    render(<Button aria-current="page">Seite 2</Button>)
    expect(screen.getByRole('button').getAttribute('aria-current')).toBe('page')
  })

  it('reicht href durch und rendert dann einen Link statt eines Buttons', () => {
    render(<Button href="/ziel">Weiter</Button>)
    expect(screen.getByRole('link', { name: 'Weiter' })).not.toBeNull()
  })
})

describe('Button.module.css', () => {
  const css = fs.readFileSync(path.resolve(process.cwd(), 'src/components/ui/Button.module.css'), 'utf8')

  it('bricht die Beschriftung nie um', () => {
    expect(css).toMatch(/white-space:\s*nowrap;/)
  })

  it('stellt den aktuell/ausgewählt-Zustand über aria-current/aria-pressed bereit, nicht über eine eigene Prop', () => {
    expect(css).toMatch(/\.button\[aria-current\]:not\(\[aria-current="false"\]\),\s*\n\.button\[aria-pressed="true"\]/)
  })
})
