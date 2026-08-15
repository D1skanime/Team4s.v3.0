// @vitest-environment jsdom

import type { ComponentType } from 'react'
import { readFileSync } from 'node:fs'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { PublicMemberLatestContribution } from '@/types/profile'
const latestContributionStyles = readFileSync('src/components/profile/LatestContributionsSection.module.css', 'utf8')

// Fester Referenzzeitpunkt (PMFE-09): entkoppelt Tests von der echten Systemzeit und dient
// als deterministischer referenceNow-Wert fuer relativeTimeLabel.
const FIXED_REFERENCE_NOW = new Date('2026-07-10T10:00:00Z').getTime()

async function loadLatestContributionsSection(): Promise<{
  LatestContributionsSection: ComponentType<{
    items: PublicMemberLatestContribution[]
    headingLevel?: 2 | 3
    referenceNow: number
  }>
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
  vi.unstubAllGlobals()
})

function makeTextItem(id: number, text: string): PublicMemberLatestContribution {
  return {
    id,
    type: 'text',
    occurred_at: '2026-07-07T10:00:00Z',
    anime_id: 21,
    anime_title: 'Karaoke Memoirs',
    release_version_id: 41,
    release_version_label: 'Episode 01 - v2',
    title: 'Mein Timing-Rückblick',
    text_preview: text,
  }
}

function makeMediaItem(id: number): PublicMemberLatestContribution {
  return {
    id,
    type: 'media',
    occurred_at: '2026-07-07T11:00:00Z',
    anime_id: 22,
    anime_title: 'Visual Stories',
    release_version_id: 42,
    release_version_label: 'Episode 03 - v1',
    image_url: '/media/release-version/41/thumb.jpg',
    media_category: 'typesetting_karaoke',
    text_preview: 'Timing-Vergleich aus der Release-Version.',
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
        referenceNow={FIXED_REFERENCE_NOW}
      />,
    )

    const list = screen.getByRole('list', { name: 'Letzte Beiträge' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(3)
    expect(screen.queryByText('Dieser vierte Beitrag gehört nicht mehr ins Fenster.')).toBeNull()
    expect(screen.queryByRole('link', { name: 'Alle Beiträge anzeigen' })).toBeNull()

    const expandButton = screen.getByRole('button', { name: 'Weitere Beiträge anzeigen' })
    const controlledListId = expandButton.getAttribute('aria-controls')
    expect(controlledListId).toBeTruthy()
    expect(document.getElementById(controlledListId!)).toBe(list)

    fireEvent.click(expandButton)

    expect(within(list).getAllByRole('listitem')).toHaveLength(4)
    expect(screen.getByText('Dieser vierte Beitrag gehört nicht mehr ins Fenster.')).not.toBeNull()
    expect(screen.queryByRole('button', { name: 'Weitere Beiträge anzeigen' })).toBeNull()
  })

  it('keeps type badge and contribution title separate for note items', async () => {
    const { LatestContributionsSection } = await loadLatestContributionsSection()

    const { container } = render(
      <LatestContributionsSection
        items={[makeTextItem(1, 'Ein Beitrag mit genug Text für den Clamp-Test.')]}
        referenceNow={FIXED_REFERENCE_NOW}
      />,
    )

    expect(screen.getByText('Ein Beitrag mit genug Text für den Clamp-Test.')).not.toBeNull()
    expect(screen.getByText('Mein Timing-Rückblick')).not.toBeNull()
    expect(screen.getByText('Karaoke Memoirs')).not.toBeNull()
    expect(screen.getByText('Episode 01 - v2')).not.toBeNull()
    expect(screen.getByText('Textbeitrag').innerHTML).not.toContain('Mein Timing-Rückblick')
    expect(container.querySelector('[data-contribution-type="text"]')).not.toBeNull()
    expect(container.querySelector('[data-line-clamp="2"]')).not.toBeNull()
    expect(screen.queryByText(/S01E|\.mkv/i)).toBeNull()
  })

  it('uses a full-width 16:9 object-cover media preview without internal metadata', async () => {
    const { LatestContributionsSection } = await loadLatestContributionsSection()

    const { container } = render(<LatestContributionsSection items={[makeMediaItem(1)]} referenceNow={FIXED_REFERENCE_NOW} />)
    const preview = screen.getByTestId('latest-contribution-media-preview') as HTMLElement
    const image = screen.getByRole('img', { name: /Visual Stories/i }) as HTMLImageElement

    expect(preview.style.aspectRatio).toBe('16 / 9')
    expect(image.style.objectFit).toBe('cover')
    expect(image.getAttribute('loading')).toBe('lazy')
    expect(image.getAttribute('sizes')).toBe('(min-width: 42rem) 240px, calc(100vw - 64px)')
    expect(image.getAttribute('width')).toBe('960')
    expect(image.getAttribute('height')).toBe('540')
    expect(screen.getByText('Typesetting-/Karaoke-Beispiel')).not.toBeNull()
    expect(screen.getByText('Episode 03 - v1')).not.toBeNull()
    expect(screen.getByText('Timing-Vergleich aus der Release-Version.')).not.toBeNull()
    expect(container.querySelector('[class*="square"]')).toBeNull()
    expect(screen.queryByText(/S01E03|\.mkv|typesetting_karaoke/i)).toBeNull()
  })

  it('supports an H3 card title and activates only the disclosure control near view', async () => {
    let observerCallback: IntersectionObserverCallback | undefined
    const disconnect = vi.fn()
    vi.stubGlobal('IntersectionObserver', class {
      constructor(callback: IntersectionObserverCallback) {
        observerCallback = callback
      }

      observe = vi.fn()
      disconnect = disconnect
      unobserve = vi.fn()
      takeRecords = vi.fn(() => [])
      root = null
      rootMargin = '600px 0px'
      thresholds = [0]
    })

    const { LatestContributionsSection } = await loadLatestContributionsSection()
    const rendered = render(
      <LatestContributionsSection
        headingLevel={3}
        items={[
          makeMediaItem(1),
          makeTextItem(2, 'SSR eins.'),
          makeTextItem(3, 'SSR zwei.'),
          makeTextItem(4, 'Erst nach Aktivierung erweiterbar.'),
        ]}
        referenceNow={FIXED_REFERENCE_NOW}
      />,
    )

    expect(screen.getByRole('heading', { level: 3, name: 'Letzte Beiträge' })).not.toBeNull()
    expect(screen.queryByRole('heading', { level: 2, name: 'Letzte Beiträge' })).toBeNull()
    const list = screen.getByRole('list', { name: 'Letzte Beiträge' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(3)
    const button = screen.getByRole('button', { name: 'Weitere Beiträge anzeigen' })
    expect(button.hasAttribute('disabled')).toBe(true)
    expect(rendered.container.querySelector(':scope > section > [aria-hidden="true"]')?.getAttribute('data-visible')).toBe('true')

    act(() => {
      observerCallback?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver)
    })

    expect(button.hasAttribute('disabled')).toBe(false)
    expect(disconnect).toHaveBeenCalledTimes(1)
    fireEvent.click(button)
    expect(within(list).getAllByRole('listitem')).toHaveLength(4)
  })

})

it('Phase 132 PMFE-09: renders the same relative-date label for a fixed referenceNow regardless of real wall-clock time (no hidden Date.now() read)', async () => {
  const { LatestContributionsSection } = await loadLatestContributionsSection()
  const item = makeTextItem(1, 'Ein Beitrag fuer den Hydration-Stabilitaetstest.')

  const first = render(
    <LatestContributionsSection items={[item]} referenceNow={FIXED_REFERENCE_NOW} />,
  )
  const firstLabel = within(screen.getByRole('list', { name: 'Letzte Beiträge' })).getByText(/^vor /).textContent
  first.unmount()

  // Real time keeps moving between these two renders (unlike referenceNow); if the component
  // still read Date.now() internally, the label would differ between the two renders.
  await new Promise((resolve) => { setTimeout(resolve, 5) })

  const second = render(
    <LatestContributionsSection items={[item]} referenceNow={FIXED_REFERENCE_NOW} />,
  )
  const secondLabel = within(screen.getByRole('list', { name: 'Letzte Beiträge' })).getByText(/^vor /).textContent

  expect(secondLabel).toBe(firstLabel)
  second.unmount()
})

it('Phase 120 RED: keeps latest contributions accessible beneath an aria-hidden shell', async () => {
    const { LatestContributionsSection } = await loadLatestContributionsSection()
    const { container } = render(
      <LatestContributionsSection
        items={[makeMediaItem(1), makeTextItem(2, 'Lesbarer SSR-Beitrag.')]}
        referenceNow={FIXED_REFERENCE_NOW}
      />,
    )

    const list = screen.getByRole('list', { name: 'Letzte Beiträge' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByText('Lesbarer SSR-Beitrag.')).not.toBeNull()
    const shell = container.querySelector(':scope > section > [aria-hidden="true"]')
    expect(shell).not.toBeNull()
    expect(shell?.querySelectorAll('[role], a, button')).toHaveLength(0)
    expect(shell?.textContent).not.toContain('Lesbarer SSR-Beitrag.')
    expect(latestContributionStyles).toMatch(/\.iconField\s*\{[^}]*width:\s*48px;[^}]*height:\s*48px;/s)
    expect(latestContributionStyles).toMatch(/opacity:\s*[01](?:\.\d+)?;/)
    expect(latestContributionStyles).toMatch(/visibility:\s*(?:visible|hidden);/)
    expect(latestContributionStyles).not.toMatch(/transition:[^;]*(?:width|height|min-height|padding|margin|transform)/)
})


it('Quick 260811-pqe bounds desktop media while preserving cover fit and mobile flow', () => {
  expect(latestContributionStyles).toMatch(/\.mediaPreview\s*\{[^}]*max-height:\s*180px;[^}]*aspect-ratio:\s*16\s*\/\s*9;/s)
  expect(latestContributionStyles).toMatch(/\.mediaPreview img\s*\{[^}]*object-fit:\s*cover;/s)
  expect(latestContributionStyles).toMatch(/@media \(max-width: 760px\)[\s\S]*?\.mediaPreview\s*\{[^}]*max-height:\s*180px;/s)
})

it('Quick 260812-lql reserves compact container-responsive media rows', async () => {
  const { LatestContributionsSection } = await loadLatestContributionsSection()
  render(<LatestContributionsSection items={[makeMediaItem(1)]} referenceNow={FIXED_REFERENCE_NOW} />)
  const list = screen.getByRole('list', { name: 'Letzte Beiträge' })
  const row = within(list).getByRole('listitem')
  const image = within(row).getByRole('img', { name: /Visual Stories/i })
  expect(within(row).getAllByText('Visual Stories')).toHaveLength(2)
  expect(within(row).getByText('Episode 03 - v1')).not.toBeNull()
  expect(within(row).getByText('Timing-Vergleich aus der Release-Version.')).not.toBeNull()
  expect(image.getAttribute('width')).toBe('960')
  expect(image.getAttribute('height')).toBe('540')
  expect(image.getAttribute('loading')).toBe('lazy')
  expect(image.getAttribute('sizes')).toBe('(min-width: 42rem) 240px, calc(100vw - 64px)')
  expect(latestContributionStyles).toMatch(/\.section\s*\{[^}]*container-type:\s*inline-size;/s)
  expect(latestContributionStyles).toMatch(/\.mediaPreview\s*\{[^}]*height:\s*clamp\(150px,\s*45cqi,\s*180px\);/s)
  expect(latestContributionStyles).toMatch(/@container[^\{]*\(min-width:\s*42rem\)[\s\S]*?\.mediaCard\s*\{[^}]*grid-template-columns:\s*minmax\(180px,\s*240px\) minmax\(0,\s*1fr\)/s)
  expect(latestContributionStyles).toMatch(/@container[^\{]*\(min-width:\s*42rem\)[\s\S]*?\.mediaPreview\s*\{[^}]*height:\s*clamp\(180px,[^;]+240px\);/s)
})
