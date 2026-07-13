import { describe, expect, it } from 'vitest'

import type { GroupHistoryRow } from '@/lib/api'
import {
  GROUP_HISTORY_EVENT_OPTIONS,
  getGroupHistoryEventPresentation,
} from '@/lib/group-history-events'
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
  it('returns only locked founding before a founding year exists', () => {
    const options = buildHistoryEventOptions([], null, null, false, false, false)

    expect(options).toHaveLength(1)
    expect(options[0]).toMatchObject({
      value: 'founding',
      disabled: true,
      disabledReason: 'Gründungsjahr fehlt',
    })
  })

  it('shows only founding and first next steps after a founding year exists', () => {
    const options = buildHistoryEventOptions([], null, 2007, false, false, false)

    expect(options.map((option) => option.value)).toEqual(['founding', 'first_project', 'first_release'])
    expect(options.find((option) => option.value === 'first_project')).toMatchObject({
      disabled: true,
      disabledReason: 'Ausblick/Rollen fehlen',
    })
    expect(options.find((option) => option.value === 'first_release')).toMatchObject({
      disabled: true,
      disabledReason: 'Release/Kara fehlt',
    })
  })

  it('keeps the later catalog hidden until first project and first release both exist', () => {
    const options = buildHistoryEventOptions([
      historyRow({ id: 13, event_type: 'first_project' }),
    ], null, 2007, true, true, true, true, true, 500, 1000)

    expect(options.some((option) => option.value === 'award')).toBe(false)
    expect(options.some((option) => option.value === 'team_change')).toBe(false)
    expect(options.some((option) => option.value === 'website_launch')).toBe(false)
    expect(options.some((option) => option.value === 'projects_10')).toBe(false)
    expect(options.some((option) => option.value === 'releases_100')).toBe(false)
  })

  it('shows later catalog entries after first project and first release both exist', () => {
    const options = buildHistoryEventOptions([
      historyRow({ id: 13, event_type: 'first_project' }),
      historyRow({ id: 14, event_type: 'first_release' }),
    ], null, 2007, true, true, true, true, true, 0, 0)

    expect(options.some((option) => option.value === 'award')).toBe(true)
    expect(options.some((option) => option.value === 'team_change')).toBe(true)
    expect(options.some((option) => option.value === 'website_launch')).toBe(true)
  })

  it('keeps an existing later entry visible while editing before the full catalog is unlocked', () => {
    const entry = historyRow({ id: 22, event_type: 'award' })
    const options = buildHistoryEventOptions([entry], entry, 2007, false, false, false)

    expect(options.some((option) => option.value === 'award')).toBe(true)
  })

  it('does not offer the generic other event type anymore', () => {
    const options = buildHistoryEventOptions([], null, 2007, true, true, true, true, true)

    expect(GROUP_HISTORY_EVENT_OPTIONS.some((option) => option.value === 'other')).toBe(false)
    expect(options.some((option) => option.value === 'other')).toBe(false)
  })

  it('falls back to milestone presentation for legacy unknown event types', () => {
    expect(getGroupHistoryEventPresentation('other')).toMatchObject({
      value: 'milestone',
      label: 'Meilenstein',
    })
  })

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

  it('hides disbanding after it was already used by another entry', () => {
    const options = buildHistoryEventOptions([
      historyRow({ id: 19, event_type: 'disbanding' }),
    ], null, 2007, true)

    expect(options.some((option) => option.value === 'disbanding')).toBe(false)
  })

  it('keeps disbanding available while editing its own entry', () => {
    const entry = historyRow({ id: 19, event_type: 'disbanding' })
    const options = buildHistoryEventOptions([entry], entry, 2007, true)

    const option = options.find((option) => option.value === 'disbanding')
    expect(option).toMatchObject({ value: 'disbanding' })
    expect(option?.disabled).toBeUndefined()
  })

  it('locks first project while project coverage is incomplete', () => {
    const options = buildHistoryEventOptions([], null, 2007, true, false)

    expect(options.find((option) => option.value === 'first_project')).toMatchObject({
      disabled: true,
      disabledReason: 'Ausblick/Rollen fehlen',
    })
  })

  it('allows first project when project coverage is complete', () => {
    const options = buildHistoryEventOptions([], null, 2007, true, true)

    const option = options.find((option) => option.value === 'first_project')
    expect(option).toMatchObject({ value: 'first_project' })
    expect(option?.disabled).toBeUndefined()
  })

  it('hides first project after it was already used by another entry', () => {
    const options = buildHistoryEventOptions([
      historyRow({ id: 13, event_type: 'first_project' }),
    ], null, 2007, true, true)

    expect(options.some((option) => option.value === 'first_project')).toBe(false)
  })

  it('keeps first project available while editing its own entry', () => {
    const entry = historyRow({ id: 13, event_type: 'first_project' })
    const options = buildHistoryEventOptions([entry], entry, 2007, true, false)

    const option = options.find((option) => option.value === 'first_project')
    expect(option).toMatchObject({ value: 'first_project' })
    expect(option?.disabled).toBeUndefined()
  })

  it('locks first release while release coverage is incomplete', () => {
    const options = buildHistoryEventOptions([], null, 2007, true, true, false)

    expect(options.find((option) => option.value === 'first_release')).toMatchObject({
      disabled: true,
      disabledReason: 'Release/Kara fehlt',
    })
  })

  it('allows first release when release coverage is complete', () => {
    const options = buildHistoryEventOptions([], null, 2007, true, true, true)

    const option = options.find((option) => option.value === 'first_release')
    expect(option).toMatchObject({ value: 'first_release' })
    expect(option?.disabled).toBeUndefined()
  })

  it('hides first release after it was already used by another entry', () => {
    const options = buildHistoryEventOptions([
      historyRow({ id: 14, event_type: 'first_release' }),
    ], null, 2007, true, true, true)

    expect(options.some((option) => option.value === 'first_release')).toBe(false)
  })

  it('keeps first release available while editing its own entry', () => {
    const entry = historyRow({ id: 14, event_type: 'first_release' })
    const options = buildHistoryEventOptions([entry], entry, 2007, true, true, false)

    const option = options.find((option) => option.value === 'first_release')
    expect(option).toMatchObject({ value: 'first_release' })
    expect(option?.disabled).toBeUndefined()
  })

  it('hides release count achievements before their qualified-release threshold is reached', () => {
    const options = buildHistoryEventOptions([], null, 2007, true, true, true, true, true, 0, 99)

    expect(options.some((option) => option.value === 'releases_100')).toBe(false)
    expect(options.some((option) => option.value === 'releases_500')).toBe(false)
    expect(options.some((option) => option.value === 'releases_1000')).toBe(false)
    expect(options.some((option) => option.value === 'releases_5000')).toBe(false)
    expect(options.some((option) => option.value === 'releases_10000')).toBe(false)
  })

  it('shows release count achievements whose qualified-release threshold is reached', () => {
    const options = buildHistoryEventOptions([], null, 2007, true, true, true, true, true, 0, 1000)

    expect(options.some((option) => option.value === 'releases_100')).toBe(true)
    expect(options.some((option) => option.value === 'releases_500')).toBe(true)
    expect(options.some((option) => option.value === 'releases_1000')).toBe(true)
    expect(options.some((option) => option.value === 'releases_5000')).toBe(false)
    expect(options.some((option) => option.value === 'releases_10000')).toBe(false)
  })

  it('uses exact threshold boundaries for legendary release achievements', () => {
    const almostLegendary = buildHistoryEventOptions([], null, 2007, true, true, true, true, true, 0, 9999)
    const legendary = buildHistoryEventOptions([], null, 2007, true, true, true, true, true, 0, 10000)

    expect(almostLegendary.some((option) => option.value === 'releases_10000')).toBe(false)
    expect(legendary.some((option) => option.value === 'releases_10000')).toBe(true)
  })

  it('hides a release count achievement after it was already used by another entry', () => {
    const options = buildHistoryEventOptions([
      historyRow({ id: 21, event_type: 'releases_100' }),
    ], null, 2007, true, true, true, true, true, 0, 100)

    expect(options.some((option) => option.value === 'releases_100')).toBe(false)
  })

  it('keeps a release count achievement available while editing its own entry', () => {
    const entry = historyRow({ id: 21, event_type: 'releases_100' })
    const options = buildHistoryEventOptions([entry], entry, 2007, true, true, true, true, true, 0, 0)

    const option = options.find((item) => item.value === 'releases_100')
    expect(option).toMatchObject({ value: 'releases_100' })
    expect(option?.disabled).toBeUndefined()
  })

  it('locks project completed while not every release has a group contribution', () => {
    const options = buildHistoryEventOptions([], null, 2007, true, true, true, false)

    expect(options.find((option) => option.value === 'project_completed')).toMatchObject({
      disabled: true,
      disabledReason: 'Release-Beiträge fehlen',
    })
  })

  it('allows project completed when release coverage is complete', () => {
    const options = buildHistoryEventOptions([], null, 2007, true, true, true, true)

    const option = options.find((option) => option.value === 'project_completed')
    expect(option).toMatchObject({ value: 'project_completed' })
    expect(option?.disabled).toBeUndefined()
  })

  it('hides project completed after it was already used by another entry', () => {
    const options = buildHistoryEventOptions([
      historyRow({ id: 15, event_type: 'project_completed' }),
    ], null, 2007, true, true, true, true)

    expect(options.some((option) => option.value === 'project_completed')).toBe(false)
  })

  it('keeps project completed available while editing its own entry', () => {
    const entry = historyRow({ id: 15, event_type: 'project_completed' })
    const options = buildHistoryEventOptions([entry], entry, 2007, true, true, true, false)

    const option = options.find((option) => option.value === 'project_completed')
    expect(option).toMatchObject({ value: 'project_completed' })
    expect(option?.disabled).toBeUndefined()
  })

  it('locks collaboration while no co-op release exists', () => {
    const options = buildHistoryEventOptions([], null, 2007, true, true, true, true, false)

    expect(options.find((option) => option.value === 'collaboration')).toMatchObject({
      disabled: true,
      disabledReason: 'Kooperation fehlt',
    })
  })

  it('allows collaboration when a co-op release exists', () => {
    const options = buildHistoryEventOptions([], null, 2007, true, true, true, true, true)

    const option = options.find((option) => option.value === 'collaboration')
    expect(option).toMatchObject({ value: 'collaboration' })
    expect(option?.disabled).toBeUndefined()
  })

  it('hides collaboration after it was already used by another entry', () => {
    const options = buildHistoryEventOptions([
      historyRow({ id: 16, event_type: 'collaboration' }),
    ], null, 2007, true, true, true, true, true)

    expect(options.some((option) => option.value === 'collaboration')).toBe(false)
  })

  it('keeps collaboration available while editing its own entry', () => {
    const entry = historyRow({ id: 16, event_type: 'collaboration' })
    const options = buildHistoryEventOptions([entry], entry, 2007, true, true, true, true, false)

    const option = options.find((option) => option.value === 'collaboration')
    expect(option).toMatchObject({ value: 'collaboration' })
    expect(option?.disabled).toBeUndefined()
  })

  it('hides project count achievements before their completed-project threshold is reached', () => {
    const options = buildHistoryEventOptions([], null, 2007, true, true, true, true, true, 9)

    expect(options.some((option) => option.value === 'projects_10')).toBe(false)
    expect(options.some((option) => option.value === 'projects_50')).toBe(false)
    expect(options.some((option) => option.value === 'projects_100')).toBe(false)
    expect(options.some((option) => option.value === 'projects_500')).toBe(false)
  })

  it('shows project count achievements whose completed-project threshold is reached', () => {
    const options = buildHistoryEventOptions([], null, 2007, true, true, true, true, true, 100)

    expect(options.some((option) => option.value === 'projects_10')).toBe(true)
    expect(options.some((option) => option.value === 'projects_50')).toBe(true)
    expect(options.some((option) => option.value === 'projects_100')).toBe(true)
    expect(options.some((option) => option.value === 'projects_500')).toBe(false)
  })

  it('uses exact threshold boundaries for legendary project achievements', () => {
    const almostLegendary = buildHistoryEventOptions([], null, 2007, true, true, true, true, true, 499)
    const legendary = buildHistoryEventOptions([], null, 2007, true, true, true, true, true, 500)

    expect(almostLegendary.some((option) => option.value === 'projects_500')).toBe(false)
    expect(legendary.some((option) => option.value === 'projects_500')).toBe(true)
  })

  it('hides a project count achievement after it was already used by another entry', () => {
    const options = buildHistoryEventOptions([
      historyRow({ id: 20, event_type: 'projects_10' }),
    ], null, 2007, true, true, true, true, true, 10)

    expect(options.some((option) => option.value === 'projects_10')).toBe(false)
  })

  it('keeps a project count achievement available while editing its own entry', () => {
    const entry = historyRow({ id: 20, event_type: 'projects_10' })
    const options = buildHistoryEventOptions([entry], entry, 2007, true, true, true, true, true, 0)

    const option = options.find((item) => item.value === 'projects_10')
    expect(option).toMatchObject({ value: 'projects_10' })
    expect(option?.disabled).toBeUndefined()
  })

  it('hides revival while no pause exists', () => {
    const options = buildHistoryEventOptions([], null, 2007, true, true, true, true, true)

    expect(options.some((option) => option.value === 'revival')).toBe(false)
  })

  it('shows revival after a pause exists', () => {
    const options = buildHistoryEventOptions([
      historyRow({ id: 17, event_type: 'hiatus' }),
    ], null, 2007, true, true, true, true, true)

    const option = options.find((option) => option.value === 'revival')
    expect(option).toMatchObject({ value: 'revival' })
    expect(option?.disabled).toBeUndefined()
  })

  it('keeps revival available while editing its own entry', () => {
    const entry = historyRow({ id: 18, event_type: 'revival' })
    const options = buildHistoryEventOptions([entry], entry, 2007, true, true, true, true, true)

    const option = options.find((option) => option.value === 'revival')
    expect(option).toMatchObject({ value: 'revival' })
    expect(option?.disabled).toBeUndefined()
  })
})
