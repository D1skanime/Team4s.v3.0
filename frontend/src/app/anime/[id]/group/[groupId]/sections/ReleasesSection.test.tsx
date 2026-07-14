import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { EpisodeReleaseSummary } from '@/types/group'

import { ReleasesSection } from './ReleasesSection'

const makeEpisode = (overrides: Partial<EpisodeReleaseSummary> = {}): EpisodeReleaseSummary => ({
  id: 1,
  episode_number: 1,
  has_op: false,
  has_ed: false,
  karaoke_count: 0,
  insert_count: 0,
  screenshot_count: 0,
  ...overrides,
})

describe('ReleasesSection (Phase 102-05)', () => {
  it('renders nothing when there are no episodes', () => {
    const markup = renderToStaticMarkup(<ReleasesSection episodes={[]} animeID={1} groupID={2} />)
    expect(markup).toBe('')
  })

  it('renders the conservative release list heading and CTA', () => {
    const markup = renderToStaticMarkup(
      <ReleasesSection episodes={[makeEpisode({ id: 10, episode_number: 1 })]} animeID={1} groupID={2} />,
    )

    expect(markup).toContain('Releases zum Fansub')
    expect(markup).toContain('href="/anime/1/group/2/releases"')
    expect(markup).toContain('Alle Releases ansehen')
  })

  it('does not render the standalone latest-release block', () => {
    const markup = renderToStaticMarkup(
      <ReleasesSection
        episodes={[
          makeEpisode({ id: 10, episode_number: 1 }),
          makeEpisode({ id: 11, episode_number: 2 }),
        ]}
        animeID={1}
        groupID={2}
      />,
    )

    expect(markup).not.toContain('latest-release-mock')
    expect(markup).not.toContain('Neuestes Release')
  })
})
