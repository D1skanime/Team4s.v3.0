// @vitest-environment jsdom

import fs from 'node:fs'
import path from 'node:path'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Breadcrumbs } from './Breadcrumbs'

const items = [{ label: 'Anime', href: '/anime' }, { label: '.hack//G.U. Trilogy' }]

describe('Breadcrumbs', () => {
  it('rendert ohne variant ohne die scrim-Klasse', () => {
    render(<Breadcrumbs items={items} />)
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' }).className).not.toMatch(/breadcrumbsScrim/)
  })

  it('wendet mit variant="scrim" die globale Scrim-Tonalität an, statt dass der Aufrufer eigene CSS-Variablen setzen muss', () => {
    render(<Breadcrumbs items={items} variant="scrim" />)
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' }).className).toMatch(/breadcrumbsScrim/)
  })
})

describe('Breadcrumbs.module.css', () => {
  const css = fs.readFileSync(path.resolve(process.cwd(), 'src/components/navigation/Breadcrumbs.module.css'), 'utf8')

  it('setzt die Scrim-Farben über Nachfahren-Selektoren mit erhöhter Spezifität, nicht über die --breadcrumb-*-Fallback-Hooks', () => {
    expect(css).toMatch(/\.breadcrumbsScrim \.breadcrumbsLink\s*\{\s*color:\s*var\(--scrim-icon\);/)
    expect(css).toMatch(/\.breadcrumbsScrim \.breadcrumbsCurrent\s*\{\s*color:\s*var\(--scrim-text\);/)
    expect(css).toMatch(/\.breadcrumbsScrim \.breadcrumbsSeparator\s*\{\s*color:\s*var\(--scrim-icon\);/)
  })
})
