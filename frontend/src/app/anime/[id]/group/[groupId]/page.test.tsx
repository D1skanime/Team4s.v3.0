// @vitest-environment jsdom

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { forwardRef, type ImgHTMLAttributes } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ProjectPage } from './ProjectPage'
import { HeroSection } from './sections/HeroSection'
import {
  buildPublicFansubProjectPath,
  hasStoryContent,
  loadPublicFansubProjectPageData,
  parsePublicFansubProjectRouteParams,
} from './projectPageData'

const projectPageSource = () =>
  readFileSync(join(process.cwd(), 'src/app/anime/[id]/group/[groupId]/ProjectPage.tsx'), 'utf8')

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

describe('ProjectPage removed section surfaces (102-06)', () => {
  it('Test 4: does not import or render the old section jump list', () => {
    const source = projectPageSource()

    expect(source).not.toContain('GroupSectionsNav')
    expect(source).not.toContain('id="themes"')
    expect(source).not.toContain('id="medien"')
  })

  it('Test 5: does not render standalone theme or media sections', () => {
    const source = projectPageSource()

    expect(source).not.toContain('ThemesSection')
    expect(source).not.toContain('MediaSection')
    expect(source).not.toContain('OP/ED/Middle')
    expect(source).not.toContain('Medien')
  })

  it('Test 6: does not render the old global empty-area summary', () => {
    const source = projectPageSource()

    expect(source).not.toContain('emptySummary')
    expect(source).not.toContain('buildEmptyAreaLabels')
    expect(source).not.toContain('Weitere Bereiche sind noch nicht')
    expect(source).not.toContain('noch nicht öffentlich befüllt')
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
