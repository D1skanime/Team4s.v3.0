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

describe('FansubHistorySection', () => {
  it('rendert bestätigte Historie getrennt von Gruppenleitung', () => {
    const html = renderToStaticMarkup(<FansubHistorySection history={history} />)

    expect(html).toContain('Historie &amp; Erfolge')
    expect(html).toContain('Erstes Komplettprojekt abgeschlossen')
    expect(html).not.toContain('Gruppenleitung')
  })

  it('zeigt EmptyState wenn keine Historie geliefert wird', () => {
    const html = renderToStaticMarkup(<FansubHistorySection history={[]} />)

    expect(html).toContain('Noch keine Erfolge veröffentlicht')
  })
})
