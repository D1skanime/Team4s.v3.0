// @vitest-environment jsdom

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { Children, isValidElement, type ReactElement, type ReactNode } from 'react'
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Button } from '@/components/ui'
import { FansubGroupPicker, type FansubGroupPickerOption } from './FansubGroupPicker'

afterEach(() => {
  cleanup()
})

// `onSelect` wird hier nur trivial weitergeleitet (`onClick={() => onSelect(...)}`), ohne
// eigene Fachlogik -- statt eines echten DOM-Klicks wird die Komponente direkt als Funktion
// aufgerufen und der gefundene `onClick`-Prop direkt invoziert (etabliertes Muster aus
// `page.test.tsx`/`AnimeDetailView.test.tsx`, hier als eigene, dateilokale Kopie).
function elements(node: ReactNode): ReactElement<Record<string, unknown>>[] {
  return Children.toArray(node).flatMap((child) => {
    if (!isValidElement<Record<string, unknown>>(child)) return []
    return [child, ...elements(child.props.children as ReactNode)]
  })
}
function textContent(node: ReactNode): string {
  return Children.toArray(node).map((child) =>
    isValidElement<{ children?: ReactNode }>(child) ? textContent(child.props.children) : String(child),
  ).join('')
}

describe('FansubGroupPicker', () => {
  it('rendert nichts, wenn options leer ist', () => {
    const { container } = render(
      <FansubGroupPicker options={[]} activeGroupId={null} showAllChip={false} onSelect={() => {}} />,
    )
    expect(container.querySelector('[role="group"]')).toBeNull()
  })

  it('rendert keinen Alle-Chip bei einer Option und showAllChip=false', () => {
    const options: FansubGroupPickerOption[] = [{ id: 1, slug: 'new-subs', name: 'New-Subs', logo_url: null }]
    render(
      <FansubGroupPicker options={options} activeGroupId={1} showAllChip={false} onSelect={() => {}} />,
    )
    expect(screen.queryByText('Alle')).toBeNull()
    const chip = screen.getByText('New-Subs').closest('button')
    expect(chip).not.toBeNull()
    expect(chip?.getAttribute('aria-pressed')).toBe('true')
  })

  it('rendert den Alle-Chip zuerst bei 2+ Optionen, aktiv bei activeGroupId=null', () => {
    const options: FansubGroupPickerOption[] = [
      { id: 1, slug: 'bloody-shadow', name: 'Bloody-Shadow', logo_url: null },
      { id: 2, slug: 'flamehaze-subs', name: 'FlameHaze-subs', logo_url: null },
    ]
    render(
      <FansubGroupPicker options={options} activeGroupId={null} showAllChip onSelect={() => {}} />,
    )
    const group = screen.getByRole('group', { name: 'Fansub-Gruppe' })
    const buttons = within(group).getAllByRole('button')
    expect(buttons[0].textContent).toContain('Alle')
    expect(buttons[0].getAttribute('aria-pressed')).toBe('true')
  })

  it('rendert ein Logo-Bild vor dem Namen, wenn logo_url gesetzt ist', () => {
    const options: FansubGroupPickerOption[] = [
      { id: 1, slug: 'new-subs', name: 'New-Subs', logo_url: '/covers/logo.png' },
    ]
    render(
      <FansubGroupPicker options={options} activeGroupId={null} showAllChip={false} onSelect={() => {}} />,
    )
    const img = document.querySelector('img')
    expect(img).not.toBeNull()
    expect(img?.getAttribute('alt')).toBe('')
    expect(img?.getAttribute('width')).toBe('20')
    expect(img?.getAttribute('height')).toBe('20')
  })

  it('rendert kein Bild-Element, wenn logo_url fehlt', () => {
    const options: FansubGroupPickerOption[] = [
      { id: 1, slug: 'new-subs', name: 'New-Subs', logo_url: null },
    ]
    render(
      <FansubGroupPicker options={options} activeGroupId={null} showAllChip={false} onSelect={() => {}} />,
    )
    expect(document.querySelector('img')).toBeNull()
  })

  it('ruft onSelect(null) bei Klick auf Alle und onSelect(id) bei Klick auf einen Gruppen-Chip auf (direkter onClick-Aufruf statt Klick-Simulation)', () => {
    const options: FansubGroupPickerOption[] = [
      { id: 1, slug: 'bloody-shadow', name: 'Bloody-Shadow', logo_url: null },
      { id: 2, slug: 'flamehaze-subs', name: 'FlameHaze-subs', logo_url: null },
    ]
    const onSelect = vi.fn()
    const tree = FansubGroupPicker({ options, activeGroupId: null, showAllChip: true, onSelect })
    const chipButtons = elements(tree).filter((element) => element.type === Button)
    const allChip = chipButtons.find((element) => textContent(element.props.children as ReactNode).includes('Alle'))
    const bloodyShadowChip = chipButtons.find((element) => textContent(element.props.children as ReactNode).includes('Bloody-Shadow'))
    expect(allChip).toBeTruthy()
    expect(bloodyShadowChip).toBeTruthy()

    ;(allChip!.props.onClick as () => void)()
    expect(onSelect).toHaveBeenLastCalledWith(null)
    ;(bloodyShadowChip!.props.onClick as () => void)()
    expect(onSelect).toHaveBeenLastCalledWith(1)
  })

  it('nutzt die globale Glas-Chip-Variante statt lokaler Farb-/Rahmen-Klassen', () => {
    const options: FansubGroupPickerOption[] = [
      { id: 1, slug: 'new-subs', name: 'New-Subs', logo_url: null },
    ]
    render(
      <FansubGroupPicker options={options} activeGroupId={1} showAllChip={false} onSelect={() => {}} />,
    )
    const chip = screen.getByText('New-Subs').closest('button')
    expect(chip?.className).toMatch(/buttonChipGlass/)
  })

  it('rendert ausschliesslich das Button-Primitive, kein natives button-Element direkt', () => {
    const options: FansubGroupPickerOption[] = [
      { id: 1, slug: 'new-subs', name: 'New-Subs', logo_url: null },
    ]
    const { container } = render(
      <FansubGroupPicker options={options} activeGroupId={null} showAllChip={false} onSelect={() => {}} />,
    )
    // Button-Primitive rendert selbst ein <button>; wichtig ist, dass es genau
    // eines pro Chip gibt (kein zusätzliches handgebautes <button> daneben).
    expect(container.querySelectorAll('button').length).toBe(1)
  })
})

/*
 * Die Kreisform/Zuschnitt-Entscheidung des Gruppenlogos kommt aus dem Avatar-Grundbaustein
 * (Größenstufe "xs") statt einer lokalen .logo-CSS-Klasse; der Icon-/Beschriftungs-Abstand
 * kommt aus Buttons eigener chipGlass-Variante statt einer lokalen .chip-gap-Deklaration.
 */
describe('FansubGroupPicker -- Avatar-Logo statt lokalem <Image>, Button-eigene chipGlass-Lücke', () => {
  it('rendert das Gruppenlogo über ein Avatar-Element (span[title]) statt eines freistehenden <img>', () => {
    const options: FansubGroupPickerOption[] = [
      { id: 1, slug: 'new-subs', name: 'New-Subs', logo_url: '/covers/logo.png' },
    ]
    const { container } = render(
      <FansubGroupPicker options={options} activeGroupId={null} showAllChip={false} onSelect={() => {}} />,
    )
    const avatarRoot = container.querySelector('span[title="New-Subs"]')
    expect(avatarRoot).not.toBeNull()
    const img = avatarRoot?.querySelector('img')
    expect(img?.getAttribute('alt')).toBe('')
    expect(img?.getAttribute('width')).toBe('20')
    expect(img?.getAttribute('height')).toBe('20')
  })

  it('FansubGroupPicker.module.css deklariert weder eine .chip-gap noch eine .logo-Klasse mehr', () => {
    const css = readFileSync(join(process.cwd(), 'src/components/fansubs/FansubGroupPicker.module.css'), 'utf8')
    expect(css).not.toMatch(/\.logo\s*\{/)
    expect(css).not.toMatch(/\.chip\s*\{[^}]*gap\s*:/)
  })
})
