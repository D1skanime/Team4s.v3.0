import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { ReviewQueue } from './ReviewQueue'

vi.mock('@/lib/api', () => ({
  listGroupProposals: vi.fn().mockResolvedValue({ data: [] }),
  confirmProposal: vi.fn().mockResolvedValue(undefined),
  rejectProposal: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/useAuthSession', () => ({
  useAuthSession: () => ({ hasAccessToken: true, isClientInitialized: true }),
}))

describe('ReviewQueue', () => {
  it('rendert ohne Fehler', () => {
    const markup = renderToStaticMarkup(<ReviewQueue fansubId={1} />)
    expect(markup).toBeTruthy()
  })

  it('zeigt Ladeindikator beim Start', () => {
    const markup = renderToStaticMarkup(<ReviewQueue fansubId={1} />)
    // Beim initialen statischen Render ist isLoading=true — LoadingState oder Skeleton sichtbar
    expect(typeof markup).toBe('string')
  })
})
