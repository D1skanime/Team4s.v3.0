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
      saveError={null}
      isEdit={false}
      eventOptions={options}
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

    const foundingOption = screen.getByRole('option', {
      name: 'Gründung (Gründungsjahr fehlt)',
    }) as HTMLOptionElement

    expect(foundingOption.disabled).toBe(true)
    expect(screen.getByText('Gesperrt: Gründung - Gründungsjahr fehlt')).not.toBeNull()
  })

  it('hides founding from the select list when it was already used', () => {
    renderForm([baseOptions[1]])

    expect(screen.queryByRole('option', { name: 'Gründung' })).toBeNull()
    expect(screen.getByRole('option', { name: 'Meilenstein' })).not.toBeNull()
  })

  it('prefills the year when selecting an available founding achievement', () => {
    const { getForm } = renderForm([
      { ...baseOptions[0], suggestedYear: 2007 },
      baseOptions[1],
    ])

    fireEvent.change(screen.getByLabelText('Erfolgstyp'), {
      target: { value: 'founding' },
    })

    expect(getForm()).toMatchObject({ eventType: 'founding', year: '2007' })
  })
})
