// @vitest-environment jsdom

import type { ComponentType } from 'react'
import { readFileSync } from 'node:fs'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import type { PublicMemberLatestContribution } from '@/types/profile'
const latestContributionStyles = readFileSync('src/components/profile/LatestContributionsSection.module.css', 'utf8')

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
      <LatestContributionsSection items={[makeTextItem(1, 'Ein Beitrag mit genug Text für den Clamp-Test.')]} />,
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

    const { container } = render(<LatestContributionsSection items={[makeMediaItem(1)]} />)
    const preview = screen.getByTestId('latest-contribution-media-preview') as HTMLElement
    const image = screen.getByRole('img', { name: /Visual Stories/i }) as HTMLImageElement

    expect(preview.style.aspectRatio).toBe('16 / 9')
    expect(image.style.objectFit).toBe('cover')
    expect(screen.getByText('Typesetting-/Karaoke-Beispiel')).not.toBeNull()
    expect(screen.getByText('Episode 03 - v1')).not.toBeNull()
    expect(screen.getByText('Timing-Vergleich aus der Release-Version.')).not.toBeNull()
    expect(container.querySelector('[class*="square"]')).toBeNull()
    expect(screen.queryByText(/S01E03|\.mkv|typesetting_karaoke/i)).toBeNull()
  })

})

it('Phase 120 RED: keeps latest contributions accessible beneath an aria-hidden shell', async () => {
    const { LatestContributionsSection } = await loadLatestContributionsSection()
    const { container } = render(
      <LatestContributionsSection items={[makeMediaItem(1), makeTextItem(2, 'Lesbarer SSR-Beitrag.')]} />,
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
