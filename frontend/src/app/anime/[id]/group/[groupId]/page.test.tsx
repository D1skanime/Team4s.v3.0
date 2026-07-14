// @vitest-environment jsdom

import { forwardRef, type ImgHTMLAttributes } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ProjectPage } from './ProjectPage'
import { HeroSection } from './sections/HeroSection'
import {
  buildPublicFansubProjectPath,
  buildEmptyAreaLabels,
  hasStoryContent,
  loadPublicFansubProjectPageData,
  parsePublicFansubProjectRouteParams,
} from './projectPageData'

vi.mock('next/image', () => {
  const MockNextImage = forwardRef<
    HTMLImageElement,
    ImgHTMLAttributes<HTMLImageElement> & { unoptimized?: boolean; priority?: boolean; fill?: boolean }
  >(({ alt, unoptimized, priority, fill, ...props }, ref) => {
    void unoptimized
    void priority
    void fill
    // eslint-disable-next-line @next/next/no-img-element
    return <img ref={ref} alt={alt} {...props} />
  })
  MockNextImage.displayName = 'MockNextImage'
  return { default: MockNextImage }
})

afterEach(() => {
  cleanup()
})

describe('hasStoryContent (AO4-13)', () => {
  it('Test 1: returns false when both story and projectNotesHtml are empty/null', () => {
    expect(hasStoryContent(null, null)).toBe(false)
    expect(hasStoryContent(undefined, undefined)).toBe(false)
    expect(hasStoryContent('   ', '')).toBe(false)
  })

  it('Test 2: projectNotesHtml takes precedence over story when both are present', () => {
    expect(hasStoryContent('Legacy-Story', '<p>Projektnotiz</p>')).toBe(true)
  })

  it('Test 3: falls back to story when projectNotesHtml is null', () => {
    expect(hasStoryContent('Legacy-Story', null)).toBe(true)
  })
})

describe('parsePublicFansubProjectRouteParams (102-01)', () => {
  it('Test 7: accepts positive numeric technical route params', () => {
    expect(parsePublicFansubProjectRouteParams({ id: '13', groupId: '1' })).toEqual({
      animeID: 13,
      groupID: 1,
    })
  })

  it('Test 8: rejects invalid technical route params', () => {
    expect(parsePublicFansubProjectRouteParams({ id: 'abc', groupId: '1' })).toBeNull()
    expect(parsePublicFansubProjectRouteParams({ id: '13', groupId: '0' })).toBeNull()
  })
})

describe('shared extraction exports (102-01)', () => {
  it('Test 9: exposes the shared project loader and render composition', () => {
    expect(loadPublicFansubProjectPageData.name).toContain('loadPublicFansubProjectPageData')
    expect(ProjectPage).toBeTypeOf('function')
  })
})

describe('buildPublicFansubProjectPath (102-02)', () => {
  it('Test 10: builds the Fansub-owned canonical project path from slugs', () => {
    expect(buildPublicFansubProjectPath('c-subs', 'vipers-creed')).toBe(
      '/fansubs/c-subs/fansubprojekt/vipers-creed',
    )
  })
})

describe('buildEmptyAreaLabels (AO4-07)', () => {
  it('Test 4: returns no labels when every area has content', () => {
    const labels = buildEmptyAreaLabels({
      hasTeamContent: true, hasStory: true, hasReleases: true, hasThemes: true, hasMedia: true,
    })
    expect(labels).toEqual([])
  })

  it('Test 5: collects a label per empty area, in the declared order', () => {
    const labels = buildEmptyAreaLabels({
      hasTeamContent: false, hasStory: false, hasReleases: false, hasThemes: false, hasMedia: false,
    })
    expect(labels).toEqual(['Beteiligte am Projekt', 'Geschichte', 'Releases', 'OP/ED/Middle', 'Release-Einblicke'])
  })

  it('Test 6: only the genuinely empty areas are collected', () => {
    const labels = buildEmptyAreaLabels({
      hasTeamContent: true, hasStory: false, hasReleases: true, hasThemes: false, hasMedia: true,
    })
    expect(labels).toEqual(['Geschichte', 'OP/ED/Middle'])
  })
})

describe('HeroSection navigation (102-03)', () => {
  const group = {
    fansub: { id: 1, slug: 'c-subs', name: 'C-Subs', logo_url: null },
    stats: { project_contributor_count: 4 },
    story: null,
  } as never
  const anime = { id: 13, title: "Viper's Creed" } as never

  it('rendert same-Fansub-Controls mit den exakten Accessible Labels', () => {
    render(
      <HeroSection
        group={group}
        anime={anime}
        groupID={1}
        animeID={13}
        heroBackdropUrl={null}
        infoPanelBackgroundUrl={null}
        heroImageUrl={null}
        heroImageIsBanner={false}
        posterImage={null}
        heroStyle={undefined}
        infoPanelStyle={undefined}
        breadcrumbItems={[]}
        cooperationGroups={[]}
        fansubProjectNavigation={{
          previous: {
            id: 7,
            title: 'Another',
            animeSlug: 'another',
            href: '/fansubs/c-subs/fansubprojekt/another',
          },
          next: {
            id: 9,
            title: 'Zeta',
            animeSlug: 'zeta',
            href: '/fansubs/c-subs/fansubprojekt/zeta',
          },
        }}
        groupAssetsResponse={null}
        releaseEpisodes={[]}
      />,
    )

    expect(screen.getByRole('link', { name: 'Vorheriges Fansub-Projekt' }).getAttribute('href')).toBe(
      '/fansubs/c-subs/fansubprojekt/another',
    )
    expect(screen.getByRole('link', { name: 'Nächstes Fansub-Projekt' }).getAttribute('href')).toBe(
      '/fansubs/c-subs/fansubprojekt/zeta',
    )
  })

  it('rendert Kooperation nur als Coop-mit-Link zur anderen Fansubgruppe', () => {
    render(
      <HeroSection
        group={group}
        anime={anime}
        groupID={1}
        animeID={13}
        heroBackdropUrl={null}
        infoPanelBackgroundUrl={null}
        heroImageUrl={null}
        heroImageIsBanner={false}
        posterImage={null}
        heroStyle={undefined}
        infoPanelStyle={undefined}
        breadcrumbItems={[]}
        cooperationGroups={[{ id: 2, slug: 'honto', name: 'Honto', logo_url: null }]}
        fansubProjectNavigation={{ previous: null, next: null }}
        groupAssetsResponse={null}
        releaseEpisodes={[]}
      />,
    )

    expect(screen.getByText('Coop mit')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Honto' }).getAttribute('href')).toBe('/fansubs/honto')
  })
})
