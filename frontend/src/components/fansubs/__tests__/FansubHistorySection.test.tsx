// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { FansubHistorySection } from '../FansubHistorySection'
import type { PublicFansubHistory } from '@/types/fansub'

const history: PublicFansubHistory[] = [
  {
    id: 1,
    year: 2014,
    event_type: 'milestone',
    title: 'Erstes Komplettprojekt abgeschlossen',
    note: 'Naruto wurde sauber archiviert.',
    status: 'confirmed',
  },
]

const countHistory: PublicFansubHistory[] = [
  {
    id: 2,
    year: 2020,
    event_type: 'projects_10',
    title: '10 Projekte',
    note: null,
    status: 'confirmed',
  },
  {
    id: 3,
    year: 2021,
    event_type: 'releases_100',
    title: '100 Releases',
    note: null,
    status: 'confirmed',
  },
]

describe('FansubHistorySection', () => {
  it('rendert bestätigte Historie getrennt von Gruppenleitung', () => {
    const html = renderToStaticMarkup(<FansubHistorySection history={history} />)

    expect(html).toContain('Historie &amp; Erfolge')
    expect(html).toContain('Erstes Komplettprojekt abgeschlossen')
    expect(html).not.toContain('Gruppenleitung')
    expect(html).toContain('historyTimeline')
    expect(html).toMatch(/class="[^"]*achGold[^"]*"/)
    expect(html).toContain('/history-event-badges-transparent/milestone.png')
    expect(html).toContain('Meilenstein')
    expect(html).toContain('2014')
    expect(html).toContain('historyTimelinePair')
    expect(html).toContain('historyTimelineAxisYear')
  })

  it('benennt Zähler-Meilensteine öffentlich als Fansub-Projekte und Fansub-Releases', () => {
    const html = renderToStaticMarkup(<FansubHistorySection history={countHistory} />)

    expect(html).toContain('10 Fansub-Projekte')
    expect(html).toContain('100 Fansub-Releases')
    expect(html).not.toContain('10 Projekte')
    expect(html).not.toContain('100 Releases')
  })

  it('benennt gespeicherte Public-Titel mit Release/Projekt ebenfalls um', () => {
    const html = renderToStaticMarkup(
      <FansubHistorySection
        history={[
          {
            id: 4,
            year: 2022,
            event_type: 'first_release',
            title: 'Erstes Release',
            note: null,
            status: 'confirmed',
          },
        ]}
      />,
    )

    expect(html).toContain('Erstes Fansub-Release')
    expect(html).not.toContain('Erstes Release')
  })

  it('markiert besonders seltene Meilensteine mit eigener Public-Timeline-Klasse', () => {
    const html = renderToStaticMarkup(
      <FansubHistorySection
        history={[
          {
            id: 7,
            year: 2028,
            event_type: 'releases_500',
            title: '500 Releases',
            note: null,
            status: 'confirmed',
          },
          {
            id: 8,
            year: 2029,
            event_type: 'releases_1000',
            title: '1000 Releases',
            note: null,
            status: 'confirmed',
          },
          {
            id: 9,
            year: 2029,
            event_type: 'releases_5000',
            title: '5000 Releases',
            note: null,
            status: 'confirmed',
          },
          {
            id: 5,
            year: 2030,
            event_type: 'projects_500',
            title: '500 Projekte',
            note: null,
            status: 'confirmed',
          },
          {
            id: 6,
            year: 2031,
            event_type: 'releases_10000',
            title: '10000 Releases',
            note: null,
            status: 'confirmed',
          },
        ]}
      />,
    )

    expect(html).toContain('historyTimelineEventReleases500')
    expect(html).toContain('historyTimelineEventReleases1000')
    expect(html).toContain('historyTimelineEventReleases5000')
    expect(html).toContain('historyTimelineEventProjects500')
    expect(html).toContain('historyTimelineEventReleases10000')
  })

  it('zeigt zuerst sechs Einträge und klappt weitere auf', () => {
    const manyHistory = Array.from({ length: 7 }, (_, index): PublicFansubHistory => ({
      id: index + 1,
      year: 2000 + index,
      event_type: 'milestone',
      title: `Meilenstein ${index + 1}`,
      note: null,
      status: 'confirmed',
    }))

    render(<FansubHistorySection history={manyHistory} />)

    expect(screen.getByText('Meilenstein 1')).not.toBeNull()
    expect(screen.getByText('Meilenstein 6')).not.toBeNull()
    expect(screen.queryByText('Meilenstein 7')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Weitere 1 anzeigen' }))

    expect(screen.getByText('Meilenstein 7')).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Weniger anzeigen' })).not.toBeNull()
  })

  it('rendert keinen Abschnitt wenn keine Historie geliefert wird', () => {
    const html = renderToStaticMarkup(<FansubHistorySection history={[]} />)

    expect(html).toBe('')
  })
})
