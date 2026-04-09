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
})
