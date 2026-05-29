// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import type { MemberProfileRecentMedia } from '@/types/profile'

import { RecentMediaSection } from './RecentMediaSection'

afterEach(() => {
  cleanup()
})

function makeMedia(overrides: Partial<MemberProfileRecentMedia> = {}): MemberProfileRecentMedia {
  return {
    id: 1,
    category: 'screenshot',
    thumbnail_url: '/media/profile/media-1.jpg',
    anime_title: 'Maboroshi no Fansub',
    ...overrides,
  }
}

describe('RecentMediaSection', () => {
  it('renders the exact empty state when there are no media items', () => {
    render(<RecentMediaSection items={[]} canView={true} isPublicView={false} />)

    expect(screen.getByText('Noch keine Medien hochgeladen.')).not.toBeNull()
  })

  it('renders the exact empty state when media cannot be viewed', () => {
    render(<RecentMediaSection items={[makeMedia()]} canView={false} isPublicView={false} />)

    expect(screen.getByText('Noch keine Medien hochgeladen.')).not.toBeNull()
    expect(screen.queryByText('Maboroshi no Fansub')).toBeNull()
  })

  it('renders up to three media cards with category and anime title', () => {
    render(
      <RecentMediaSection
        canView={true}
        isPublicView={true}
        items={[
          makeMedia({ id: 1, category: 'screenshot', anime_title: 'Maboroshi no Fansub' }),
          makeMedia({ id: 2, category: 'typesetting_karaoke', anime_title: 'Karaoke Works' }),
          makeMedia({ id: 3, category: 'logo', anime_title: 'Logo Archive' }),
          makeMedia({ id: 4, category: 'extra', anime_title: 'Nicht sichtbar' }),
        ]}
      />,
    )

    const list = screen.getByRole('list', { name: 'Letzte Medien' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(3)
    expect(screen.getByText('screenshot')).not.toBeNull()
    expect(screen.getByText('Maboroshi no Fansub')).not.toBeNull()
    expect(screen.getByText('typesetting_karaoke')).not.toBeNull()
    expect(screen.getByText('Karaoke Works')).not.toBeNull()
    expect(screen.queryByText('Nicht sichtbar')).toBeNull()
  })
})
