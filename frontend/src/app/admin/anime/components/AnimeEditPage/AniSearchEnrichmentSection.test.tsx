import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { AniSearchEnrichmentSection } from './AniSearchEnrichmentSection'

describe('AniSearchEnrichmentSection', () => {
  it('renders the approved AniSearch copy and accessibility structure', () => {
    const markup = renderToStaticMarkup(
      <AniSearchEnrichmentSection
        anisearchID="12345"
        protectedFields={['title']}
        statusMessage="AniSearch Ergebnis"
        onAniSearchIDChange={vi.fn()}
        onProtectedFieldsChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(markup).toContain('AniSearch Daten laden')
    expect(markup).toContain('Felder schuetzen')
    expect(markup).toContain('<fieldset')
    expect(markup).toContain('<legend>Felder schuetzen</legend>')
    expect(markup).toContain('aria-live="polite"')
    expect(markup).toContain('AniSearch laden')
  })

  it('renders the duplicate AniSearch redirect action inside the existing card', () => {
    const markup = renderToStaticMarkup(
      <AniSearchEnrichmentSection
        anisearchID="12345"
        protectedFields={['title']}
        conflictResult={{
          mode: 'conflict',
          anisearch_id: '12345',
          existing_anime_id: 84,
          existing_title: 'Serial Experiments Lain',
          redirect_path: '/admin/anime/84/edit',
        }}
        onAniSearchIDChange={vi.fn()}
        onProtectedFieldsChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(markup).toContain('AniSearch ID 12345 ist bereits mit Serial Experiments Lain verknuepft.')
    expect(markup).toContain('Zum vorhandenen Anime wechseln')
    expect(markup).toContain('href="/admin/anime/84/edit"')
  })

  it('keeps the current success and empty states when no conflict exists', () => {
    const successMarkup = renderToStaticMarkup(
      <AniSearchEnrichmentSection
        anisearchID="12345"
        protectedFields={[]}
        statusMessage="AniSearch geladen. 2 Felder aktualisiert, 0 geschuetzt, 1 Relationen uebernommen."
        onAniSearchIDChange={vi.fn()}
        onProtectedFieldsChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )
    const emptyMarkup = renderToStaticMarkup(
      <AniSearchEnrichmentSection
        anisearchID=""
        protectedFields={[]}
        onAniSearchIDChange={vi.fn()}
        onProtectedFieldsChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(successMarkup).toContain('AniSearch geladen. 2 Felder aktualisiert, 0 geschuetzt, 1 Relationen uebernommen.')
    expect(successMarkup).not.toContain('Zum vorhandenen Anime wechseln')
    expect(emptyMarkup).toContain('Noch keine AniSearch-Daten geladen.')
  })
})
