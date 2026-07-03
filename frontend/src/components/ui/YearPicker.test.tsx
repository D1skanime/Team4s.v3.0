// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { YearPicker } from './YearPicker'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('YearPicker', () => {
  it('opens an empty picker near the current year instead of the max-year page', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-03T08:00:00Z'))

    render(
      <YearPicker
        id="history-year"
        label="Jahr"
        value=""
        minYear={1990}
        maxYear={2099}
        onChange={() => undefined}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Jahr' }))

    expect(screen.getByText('2016-2027')).not.toBeNull()
    expect(screen.getByRole('button', { name: '2026' })).not.toBeNull()
    expect(screen.queryByText('2088-2099')).toBeNull()
  })
})
