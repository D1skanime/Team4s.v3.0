import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import type { EpisodeReleaseSummary } from '@/types/group'

// LatestReleaseSection is an async server component (awaits getGroupReleaseDetail
// internally) and cannot be rendered via plain renderToStaticMarkup outside of the
// Next.js RSC pipeline. Mock both composed sections so this test stays focused on
// ReleasesSection's own composition logic (which release is "latest", whether the
// older-releases list is rendered, and the "Alle Releases ansehen" CTA link).
// vi.mock calls are hoisted above imports by Vitest, so this works despite the
// import of ReleasesSection appearing below.
vi.mock('./LatestReleaseSection', () => ({
  LatestReleaseSection: ({ releaseVersionID }: { releaseVersionID: number }) => (
    <div data-testid="latest-release-mock">{releaseVersionID}</div>
  ),
}))
vi.mock('./OlderReleasesList', () => ({
  OlderReleasesList: ({ excludeReleaseVersionId }: { excludeReleaseVersionId: number }) => (
    <div id="weitere-releases" data-testid="older-releases-mock">{excludeReleaseVersionId}</div>
  ),
}))

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

describe('ReleasesSection (AO4-11/AO4-12/AO4-13)', () => {
  it('Test 1: renders nothing when there are no episodes (empty case handled by page-level Sammel-Hinweis)', () => {
    const markup = renderToStaticMarkup(<ReleasesSection episodes={[]} animeID={1} groupID={2} />)
    expect(markup).toBe('')
  })

  it('Test 2: renders the "Alle Releases ansehen" link with the correct target', () => {
    const markup = renderToStaticMarkup(
      <ReleasesSection episodes={[makeEpisode({ id: 10, episode_number: 1 })]} animeID={1} groupID={2} />,
    )
    expect(markup).toContain('href="/anime/1/group/2/releases"')
    expect(markup).toContain('Alle Releases ansehen')
  })

  it('Test 3: single episode renders only the latest-release preview, not the older-releases list', () => {
    const markup = renderToStaticMarkup(
      <ReleasesSection episodes={[makeEpisode({ id: 10, episode_number: 1 })]} animeID={1} groupID={2} />,
    )
    expect(markup).toContain('latest-release-mock')
    expect(markup).not.toContain('weitere-releases')
  })

  it('Test 4: multiple episodes pass the highest episode_number as latest and render the older-releases list excluding it', () => {
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
    expect(markup).toContain('id="weitere-releases"')
    // Latest release mock renders the passed releaseVersionID (11 = highest episode_number)
    expect(markup).toContain('>11<')
  })
})
