import { describe, expect, it } from 'vitest'

import { buildArchivUrl } from './buildArchivUrl'

describe('buildArchivUrl', () => {
  it('setzt nur die Seitenzahl, wenn keine Filter aktiv sind', () => {
    expect(buildArchivUrl({}, 2)).toBe('/archiv?page=2')
  })

  it('übernimmt alle aktiven Filter in die Ziel-URL', () => {
    const href = buildArchivUrl({ rolle: 'fansub_lead', gruppe: 'Team4s', von: '2026-01-01', bis: '2026-12-31' }, 3)
    const params = new URL(href, 'http://localhost').searchParams

    expect(params.get('page')).toBe('3')
    expect(params.get('rolle')).toBe('fansub_lead')
    expect(params.get('gruppe')).toBe('Team4s')
    expect(params.get('von')).toBe('2026-01-01')
    expect(params.get('bis')).toBe('2026-12-31')
  })

  it('belässt den literalen {page}-Platzhalter unkodiert, wenn er für ein hrefPattern gebaut wird', () => {
    const href = buildArchivUrl({ rolle: 'fansub_lead' }, '{page}')
    expect(href).toBe('/archiv?rolle=fansub_lead&page={page}')
  })

  it('verankert den Platzhalter-Ersatz auf den page-Parameter, selbst wenn ein Filterwert zufällig denselben kodierten Text wie der Platzhalter trägt', () => {
    // Regressionstest für einen gefundenen Fund: ein Aufrufer, der `rolle=%7Bpage%7D` als
    // normalen Query-Parameter mitschickt (z. B. eine kopierte URL), darf nicht dazu führen,
    // dass der blinde erste Treffer eines ungeankerten Ersatzes den FALSCHEN Parameter
    // entschlüsselt -- sonst bliebe die echte Seitenzahl für immer der literale Platzhalter-Text.
    const href = buildArchivUrl({ rolle: '{page}' }, '{page}')
    expect(href).toBe('/archiv?rolle=%7Bpage%7D&page={page}')
  })
})
