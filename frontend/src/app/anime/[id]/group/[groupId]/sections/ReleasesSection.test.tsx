import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { PublicReleasePreview } from '@/components/fansubs/PublicReleaseBlock'
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

const makePreview = (overrides: Partial<PublicReleasePreview> = {}): PublicReleasePreview => ({
  id: 10,
  href: '/anime/1/group/2/releases/10',
  episodeLabel: 'Folge 1',
  title: 'Signal im Regen',
  versionLabel: 'v1',
  durationLabel: '00:23:00',
  imageCount: 2,
  noteCount: 1,
  contributorCount: 4,
  timelineSegments: [],
  ...overrides,
})

describe('ReleasesSection (Phase 102-05)', () => {
  it('renders nothing when there are no episodes', () => {
    const markup = renderToStaticMarkup(
      <ReleasesSection episodes={[]} publicReleasePreviews={[]} animeID={1} groupID={2} />,
    )
    expect(markup).toBe('')
  })

  it('renders the public release block and CTA when activity previews are available', () => {
    const markup = renderToStaticMarkup(
      <ReleasesSection
        episodes={[makeEpisode({ id: 10, episode_number: 1 })]}
        publicReleasePreviews={[makePreview()]}
        animeID={1}
        groupID={2}
      />,
    )

    expect(markup).toContain('Releases zum Fansub')
    expect(markup).toContain('Neuestes Fansub-Release')
    expect(markup).toContain('Signal im Regen')
    expect(markup).toContain('href="/anime/1/group/2/releases"')
    expect(markup).toContain('Alle Releases ansehen')
  })

  it('falls back to the conservative release list without activity previews', () => {
    const markup = renderToStaticMarkup(
      <ReleasesSection
        episodes={[
          makeEpisode({ id: 10, episode_number: 1 }),
          makeEpisode({ id: 11, episode_number: 2 }),
        ]}
        publicReleasePreviews={[]}
        animeID={1}
        groupID={2}
      />,
    )

    expect(markup).toContain('Releases zum Fansub')
    expect(markup).not.toContain('Neuestes Fansub-Release')
  })
})
