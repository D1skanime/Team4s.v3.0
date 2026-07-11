import { describe, expect, it } from 'vitest'

import type { GroupHistoryRow } from '@/lib/api'
import { buildHistoryEventOptions } from './GroupHistorySection'

function historyRow(overrides: Partial<GroupHistoryRow>): GroupHistoryRow {
  return {
    id: overrides.id ?? 1,
    fansub_group_id: overrides.fansub_group_id ?? 88,
    year: overrides.year ?? null,
    event_type: overrides.event_type ?? 'milestone',
    title: overrides.title ?? 'Test',
    note: overrides.note ?? null,
    status: overrides.status ?? 'published',
    created_by: overrides.created_by ?? null,
    created_at: overrides.created_at ?? '2026-07-11T09:00:00Z',
  }
}

describe('buildHistoryEventOptions', () => {
  it('locks website launch while no website community link exists', () => {
    const options = buildHistoryEventOptions([], null, 2007, false)

    expect(options.find((option) => option.value === 'website_launch')).toMatchObject({
      disabled: true,
      disabledReason: 'Webseite fehlt',
    })
  })

  it('allows website launch when a website community link exists', () => {
    const options = buildHistoryEventOptions([], null, 2007, true)

    const option = options.find((option) => option.value === 'website_launch')
    expect(option).toMatchObject({ value: 'website_launch' })
    expect(option?.disabled).toBeUndefined()
  })

  it('hides website launch after it was already used by another entry', () => {
    const options = buildHistoryEventOptions([
      historyRow({ id: 12, event_type: 'website_launch' }),
    ], null, 2007, true)

    expect(options.some((option) => option.value === 'website_launch')).toBe(false)
  })

  it('keeps website launch available while editing its own entry', () => {
    const entry = historyRow({ id: 12, event_type: 'website_launch' })
    const options = buildHistoryEventOptions([entry], entry, 2007, false)

    const option = options.find((option) => option.value === 'website_launch')
    expect(option).toMatchObject({ value: 'website_launch' })
    expect(option?.disabled).toBeUndefined()
  })

  it('locks first project while project coverage is incomplete', () => {
    const options = buildHistoryEventOptions([], null, 2007, true, false)

    expect(options.find((option) => option.value === 'first_release')).toMatchObject({
      disabled: true,
      disabledReason: 'Ausblick/Rollen fehlen',
    })
  })

  it('allows first project when project coverage is complete', () => {
    const options = buildHistoryEventOptions([], null, 2007, true, true)

    const option = options.find((option) => option.value === 'first_release')
    expect(option).toMatchObject({ value: 'first_release' })
    expect(option?.disabled).toBeUndefined()
  })

  it('hides first project after it was already used by another entry', () => {
    const options = buildHistoryEventOptions([
      historyRow({ id: 13, event_type: 'first_release' }),
    ], null, 2007, true, true)

    expect(options.some((option) => option.value === 'first_release')).toBe(false)
  })

  it('keeps first project available while editing its own entry', () => {
    const entry = historyRow({ id: 13, event_type: 'first_release' })
    const options = buildHistoryEventOptions([entry], entry, 2007, true, false)

    const option = options.find((option) => option.value === 'first_release')
    expect(option).toMatchObject({ value: 'first_release' })
    expect(option?.disabled).toBeUndefined()
  })
})
