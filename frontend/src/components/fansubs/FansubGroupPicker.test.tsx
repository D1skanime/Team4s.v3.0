// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { FansubGroupPicker, type FansubGroupPickerOption } from './FansubGroupPicker'

afterEach(() => {
  cleanup()
})

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

  it('ruft onSelect(null) bei Klick auf Alle und onSelect(id) bei Klick auf einen Gruppen-Chip auf', () => {
    const options: FansubGroupPickerOption[] = [
      { id: 1, slug: 'bloody-shadow', name: 'Bloody-Shadow', logo_url: null },
      { id: 2, slug: 'flamehaze-subs', name: 'FlameHaze-subs', logo_url: null },
    ]
    const onSelect = vi.fn()
    render(
      <FansubGroupPicker options={options} activeGroupId={null} showAllChip onSelect={onSelect} />,
    )
    fireEvent.click(screen.getByText('Alle'))
    expect(onSelect).toHaveBeenLastCalledWith(null)
    fireEvent.click(screen.getByText('Bloody-Shadow'))
    expect(onSelect).toHaveBeenLastCalledWith(1)
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
