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
  it('rendert bestÃ¤tigte Historie getrennt von Gruppenleitung', () => {
    const html = renderToStaticMarkup(<FansubHistorySection history={history} />)

    expect(html).toContain('Historie &amp; Erfolge')
    expect(html).toContain('Erstes Komplettprojekt abgeschlossen')
    expect(html).not.toContain('Gruppenleitung')
    // milestone -> echtes Achievement-Bild mit Jahres-Chip
    expect(html).toMatch(/class="[^"]*achGold[^"]*"/)
    expect(html).toContain('/history-event-badges-transparent/milestone.png')
    expect(html).toContain('Meilenstein')
    expect(html).toContain('2014')
  })

  it('rendert keinen Abschnitt wenn keine Historie geliefert wird', () => {
    const html = renderToStaticMarkup(<FansubHistorySection history={[]} />)

    expect(html).toBe('')
  })
})
