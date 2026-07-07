// @vitest-environment jsdom

import type { ComponentType } from 'react'
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import type { PublicMemberLatestContribution } from '@/types/profile'

async function loadLatestContributionsSection(): Promise<{
  LatestContributionsSection: ComponentType<{ items: PublicMemberLatestContribution[] }>
}> {
  try {
    const modulePath = './LatestContributionsSection'
    return await import(/* @vite-ignore */ modulePath)
  } catch (error) {
    throw new Error(`LatestContributionsSection must exist for the Phase 99 latest public feed: ${String(error)}`)
  }
}

afterEach(() => {
  cleanup()
})

function makeTextItem(id: number, text: string): PublicMemberLatestContribution {
  return {
    id,
    type: 'text',
    occurred_at: '2026-07-07T10:00:00Z',
    anime_id: 21,
    anime_title: 'Karaoke Memoirs',
    release_version_id: 501,
    release_version_label: 'v2',
    text_preview: text,
  }
}

function makeMediaItem(id: number): PublicMemberLatestContribution {
  return {
    id,
    type: 'media',
    occurred_at: '2026-07-07T11:00:00Z',
    anime_id: 22,
    anime_title: 'Screenshot Stories',
    release_version_id: 502,
    release_version_label: 'v1',
    image_url: '/media/release-version/41/thumb.jpg',
    caption: 'Timing-Vergleich aus der Release-Version.',
  }
}

describe('LatestContributionsSection', () => {
  it('renders exactly three non-empty latest public contribution cards and no archive link', async () => {
    const { LatestContributionsSection } = await loadLatestContributionsSection()

    render(
      <LatestContributionsSection
        items={[
          makeMediaItem(1),
          makeTextItem(2, 'Ein kompakter Beitrag aus der Übersetzung.'),
          makeTextItem(3, 'Ein kurzer QC-Hinweis.'),
          makeTextItem(4, '   '),
          makeTextItem(5, 'Dieser vierte Beitrag gehört nicht mehr ins Fenster.'),
        ]}
      />,
    )

    const list = screen.getByRole('list', { name: 'Letzte Beiträge' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(3)
    expect(screen.queryByText('Dieser vierte Beitrag gehört nicht mehr ins Fenster.')).toBeNull()
    expect(screen.queryByRole('link', { name: 'Alle Beiträge anzeigen' })).toBeNull()
  })

  it('uses compact two-line text cards for note items', async () => {
    const { LatestContributionsSection } = await loadLatestContributionsSection()

    const { container } = render(
      <LatestContributionsSection items={[makeTextItem(1, 'Ein Beitrag mit genug Text für den Clamp-Test.')]} />,
    )

    expect(screen.getByText('Ein Beitrag mit genug Text für den Clamp-Test.')).not.toBeNull()
    expect(container.querySelector('[data-contribution-type="text"]')).not.toBeNull()
    expect(container.querySelector('[data-line-clamp="2"]')).not.toBeNull()
  })

  it('uses a full-width 16:9 object-cover media preview without square thumbnails', async () => {
    const { LatestContributionsSection } = await loadLatestContributionsSection()

    const { container } = render(<LatestContributionsSection items={[makeMediaItem(1)]} />)
    const preview = screen.getByTestId('latest-contribution-media-preview') as HTMLElement
    const image = screen.getByRole('img', { name: /Screenshot Stories/i }) as HTMLImageElement

    expect(preview.style.aspectRatio).toBe('16 / 9')
    expect(image.style.objectFit).toBe('cover')
    expect(container.querySelector('[class*="square"]')).toBeNull()
  })
})
