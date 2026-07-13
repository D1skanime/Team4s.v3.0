// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import {
  EMPTY_HISTORY_FORM,
  GroupHistoryForm,
  type HistoryEventOptionState,
  type HistoryFormState,
} from './GroupHistoryForm'

const baseOptions: HistoryEventOptionState[] = [
  {
    value: 'founding',
    label: 'Gründung',
    imageSrc: '/history-event-badges-transparent/founding.png',
  },
  {
    value: 'milestone',
    label: 'Meilenstein',
    imageSrc: '/history-event-badges-transparent/milestone.png',
  },
]

function renderForm(
  options: HistoryEventOptionState[],
  initialForm: HistoryFormState = EMPTY_HISTORY_FORM,
  yearBounds: { minYear?: number; maxYear?: number } = {},
) {
  let form = initialForm
  const onFormChange = vi.fn((updater: (prev: HistoryFormState) => HistoryFormState) => {
    form = updater(form)
  })

  render(
    <GroupHistoryForm
      form={form}
      onFormChange={onFormChange}
      onSubmit={vi.fn()}
      onCancel={vi.fn()}
      isSaving={false}
      titleError={null}
      yearError={null}
      saveError={null}
      isEdit={false}
      eventOptions={options}
      {...yearBounds}
    />,
  )

  return { getForm: () => form, onFormChange }
}

describe('GroupHistoryForm achievement availability', () => {
  it('shows founding as disabled when the founding year is missing', () => {
    renderForm([
      { ...baseOptions[0], disabled: true, disabledReason: 'Gründungsjahr fehlt' },
      baseOptions[1],
    ])

    const foundingOption = screen.getByRole('radio', {
      name: /Gründung/,
    }) as HTMLButtonElement

    expect(foundingOption.disabled).toBe(true)
    expect(screen.queryByText(/Gesperrt:/)).toBeNull()
  })

  it('hides founding from the picker when it was already used', () => {
    renderForm([baseOptions[1]])

    expect(screen.queryByRole('radio', { name: /Gründung/ })).toBeNull()
    expect(screen.getByRole('radio', { name: /Meilenstein/ })).not.toBeNull()
  })

  it('prefills the year when selecting an available founding achievement', () => {
    const { getForm } = renderForm([
      { ...baseOptions[0], suggestedYear: 2007 },
      baseOptions[1],
    ])

    fireEvent.click(screen.getByRole('radio', { name: /Gründung/ }))

    expect(getForm()).toMatchObject({ eventType: 'founding', year: '2007' })
  })

  it('shows progress for locked project and release achievements', () => {
    renderForm([
      {
        value: 'projects_10',
        label: '10 Projekte',
        category: 'project_count',
        imageSrc: '/history-event-badges-transparent/projects_10.png',
        disabled: true,
        disabledReason: '10 Projekte erforderlich',
        progressCurrent: 8,
        progressTarget: 10,
      },
      {
        value: 'releases_100',
        label: '100 Releases',
        category: 'release_count',
        imageSrc: '/history-event-badges-transparent/releases_100.png',
        disabled: true,
        disabledReason: '100 Releases erforderlich',
        progressCurrent: 42,
        progressTarget: 100,
      },
    ])

    expect(screen.getByText('8/10')).not.toBeNull()
    expect(screen.getByText('42/100')).not.toBeNull()
    expect(screen.getByText('fast geschafft')).not.toBeNull()
    expect((screen.getByRole('radio', { name: /10 Projekte/ }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('does not offer years before the founding year', () => {
    renderForm(
      baseOptions,
      { ...EMPTY_HISTORY_FORM, year: '2007' },
      { minYear: 2007, maxYear: 2026 },
    )

    fireEvent.click(screen.getByLabelText('Jahr'))

    expect(screen.getByRole('button', { name: '2007' })).not.toBeNull()
    expect(screen.queryByRole('button', { name: '2006' })).toBeNull()
  })

  it('does not offer future years', () => {
    renderForm(baseOptions, EMPTY_HISTORY_FORM, { maxYear: 2026 })

    fireEvent.click(screen.getByLabelText('Jahr'))

    expect(screen.getByRole('button', { name: '2026' })).not.toBeNull()
    expect(screen.queryByRole('button', { name: '2027' })).toBeNull()
  })
})
