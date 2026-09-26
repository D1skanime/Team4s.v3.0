import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { PublicReleasePreview } from '@/components/fansubs/PublicReleaseBlock'

import { ReleasesSection } from './ReleasesSection'

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
  it('renders the public release block and CTA when activity previews are available', () => {
    const markup = renderToStaticMarkup(
      <ReleasesSection
        publicReleasePreviews={[makePreview()]}
        animeID={1}
        groupID={2}
        releaseBackdropUrl="/media/vipers-creed-banner.jpg"
      />,
    )

    expect(markup).toContain('Neuestes Release')
    expect(markup).toContain('Neuestes Fansub-Release')
    expect(markup).toContain('Signal im Regen')
    expect(markup).not.toContain('Alle Releases ansehen')
    expect(markup).toContain('data-project-release-band="true"')
    expect(markup).toContain('background-image:url(&quot;/media/vipers-creed-banner.jpg&quot;)')
    expect(markup.indexOf('Neuestes Fansub-Release')).toBeLessThan(markup.indexOf('data-project-release-band="true"'))
  })

  it('falls back to the conservative release list without activity previews (Plan 155-04: gate moved to ProjectPage.tsx via data.hasReleases)', () => {
    const markup = renderToStaticMarkup(
      <ReleasesSection publicReleasePreviews={[]} animeID={1} groupID={2} />,
    )

    expect(markup).not.toContain('Alle Releases ansehen')
    expect(markup).not.toContain('Neuestes Fansub-Release')
  })
})
