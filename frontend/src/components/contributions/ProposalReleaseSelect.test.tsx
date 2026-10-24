// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ProposalReleaseSelect } from './ProposalReleaseSelect'

afterEach(() => {
  cleanup()
})

const OPTIONS = [{ id: 152, label: 'Episode 12 — Foo · v2' }]

describe('ProposalReleaseSelect — optionale Release-Einschraenkung (D-29)', () => {
  it('rendert disabled mit nur "Ganzes Projekt", solange disabled gesetzt ist (kein aktives Projekt)', () => {
    render(
      <ProposalReleaseSelect
        options={[]}
        selectedReleaseVersionId={null}
        isLoading={false}
        disabled
        onChange={vi.fn()}
      />,
    )

    const select = screen.getByLabelText('Release (optional)') as HTMLSelectElement
    expect(select.disabled).toBe(true)
    expect(Array.from(select.options).map((option) => option.textContent)).toEqual(['Ganzes Projekt'])
  })

  it('zeigt waehrend isLoading ausschliesslich "Wird geladen…" statt der (ggf. veralteten) Optionsliste', () => {
    render(
      <ProposalReleaseSelect
        options={OPTIONS}
        selectedReleaseVersionId={null}
        isLoading
        onChange={vi.fn()}
      />,
    )

    const select = screen.getByLabelText('Release (optional)') as HTMLSelectElement
    expect(select.disabled).toBe(true)
    expect(Array.from(select.options).map((option) => option.textContent)).toEqual(['Wird geladen…'])
  })

  it('zeigt "Ganzes Projekt" als erste Option und die geladenen Releases danach, Auswahl spiegelt selectedReleaseVersionId', () => {
    render(
      <ProposalReleaseSelect
        options={OPTIONS}
        selectedReleaseVersionId={152}
        isLoading={false}
        onChange={vi.fn()}
      />,
    )

    const select = screen.getByLabelText('Release (optional)') as HTMLSelectElement
    expect(Array.from(select.options).map((option) => option.textContent)).toEqual([
      'Ganzes Projekt',
      'Episode 12 — Foo · v2',
    ])
    expect(select.value).toBe('152')
  })

  it('ruft onChange mit der numerischen ID auf, wenn ein Release gewaehlt wird', () => {
    const onChange = vi.fn()
    render(
      <ProposalReleaseSelect
        options={OPTIONS}
        selectedReleaseVersionId={null}
        isLoading={false}
        onChange={onChange}
      />,
    )

    fireEvent.change(screen.getByLabelText('Release (optional)'), { target: { value: '152' } })
    expect(onChange).toHaveBeenCalledWith(152)
  })

  it('ruft onChange mit null auf, wenn "Ganzes Projekt" (leerer Wert) gewaehlt wird', () => {
    const onChange = vi.fn()
    render(
      <ProposalReleaseSelect
        options={OPTIONS}
        selectedReleaseVersionId={152}
        isLoading={false}
        onChange={onChange}
      />,
    )

    fireEvent.change(screen.getByLabelText('Release (optional)'), { target: { value: '' } })
    expect(onChange).toHaveBeenCalledWith(null)
  })
})
