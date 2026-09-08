// @vitest-environment jsdom

import type { ImgHTMLAttributes } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { axe } from 'jest-axe'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/image', () => ({
  default: ({
    alt,
    priority,
    unoptimized,
    ...props
  }: ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean; unoptimized?: boolean }) => {
    void priority
    void unoptimized
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={alt} {...props} />
  },
}))

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
  it('rendert bestätigte Historie getrennt von Gruppenleitung, mit Artwork-Slot statt rohem Bildpfad', () => {
    render(<FansubHistorySection history={history} />)

    expect(screen.getByText('Historie & Erfolge')).not.toBeNull()
    expect(screen.getByText('Erstes Komplettprojekt abgeschlossen')).not.toBeNull()
    expect(screen.queryByText('Gruppenleitung')).toBeNull()
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    expect(screen.getByText('Meilenstein')).not.toBeNull()
    expect(screen.getAllByText('2014')).toHaveLength(2)

    // Badge geht durch den geteilten AchievementArtwork-Slot (data-achievement-art), nicht mehr
    // über einen rohen <img src="...">.
    const badge = document.querySelector('[data-achievement-art="milestone"]')
    expect(badge).not.toBeNull()
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

  it('lässt einen admin-eingegebenen Freitext-Titel byte-für-byte unverändert (A5-Regression)', () => {
    const html = renderToStaticMarkup(
      <FansubHistorySection
        history={[
          {
            id: 10,
            year: 2023,
            event_type: 'award',
            title: 'Projektor gekauft',
            note: null,
            status: 'confirmed',
          },
        ]}
      />,
    )

    expect(html).toContain('Projektor gekauft')
    expect(html).not.toContain('Fansub-Projektor gekauft')
  })

  it('markiert genau die zwei legendären Meilensteine mit data-emphasis, nicht die mittleren Stufen', () => {
    render(
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
          {
            id: 11,
            year: 2032,
            event_type: 'milestone',
            title: 'Kontrollgruppe',
            note: null,
            status: 'confirmed',
          },
        ]}
      />,
    )

    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(6)

    const emphasisByBadge = (badgeCode: string) =>
      document
        .querySelector(`[data-achievement-art="${badgeCode}"]`)
        ?.closest('li')
        ?.getAttribute('data-emphasis')

    expect(emphasisByBadge('projects_500')).toBe('legendary')
    expect(emphasisByBadge('releases_10000')).toBe('legendary')
    expect(emphasisByBadge('releases_500')).toBeNull()
    expect(emphasisByBadge('releases_1000')).toBeNull()
    expect(emphasisByBadge('releases_5000')).toBeNull()
    expect(emphasisByBadge('milestone')).toBeNull()
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

  it('hält die Jahreszahl der Spine-Markierung aus dem Accessibility-Tree, das Jahr in der Karte bleibt sichtbar', () => {
    render(<FansubHistorySection history={history} />)

    const axisYear = document.querySelector('[data-achievement-art="milestone"]')
      ?.closest('.historyTimelinePair, [class*="historyTimelinePair"]')
      ?.querySelector('[class*="historyTimelineAxisYear"]')
    expect(axisYear?.getAttribute('aria-hidden')).toBe('true')

    const cardYear = document.querySelector('[class*="historyTimelineYear"]')
    expect(cardYear).not.toBeNull()
    expect(cardYear?.getAttribute('aria-hidden')).toBeNull()
  })

  it('hat keine axe-Verstöße bei einer gefüllten Timeline', async () => {
    const { container } = render(<FansubHistorySection history={[...history, ...countHistory]} />)

    expect(await axe(container)).toHaveNoViolations()
  })
})
