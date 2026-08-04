// @vitest-environment jsdom

import type { ComponentType } from 'react'
import { readFileSync } from 'node:fs'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import type { PublicMemberPreviousContribution } from '@/types/profile'
const previousContributionStyles = readFileSync('src/components/profile/PreviousContributionsSection.module.css', 'utf8')

async function loadPreviousContributionsSection(): Promise<{
  PreviousContributionsSection: ComponentType<{
    items: PublicMemberPreviousContribution[]
    totalCount?: number
  }>
}> {
  try {
    const modulePath = './PreviousContributionsSection'
    return await import(/* @vite-ignore */ modulePath)
  } catch (error) {
    throw new Error(`PreviousContributionsSection must exist for the Phase 99 collapsed previous-history behavior: ${String(error)}`)
  }
}

afterEach(() => {
  cleanup()
})

const previousItems: PublicMemberPreviousContribution[] = [
  {
    anime_id: 31,
    anime_title: 'Archiv der Sterne',
    fansub_group_id: 7,
    fansub_group_name: 'AnimeOwnage',
    started_year: 2014,
    ended_year: 2017,
    roles: ['Übersetzung', 'Timing'],
  },
  {
    anime_id: 32,
    anime_title: 'Ohne Jahr darf nicht erscheinen',
    fansub_group_id: 7,
    fansub_group_name: 'AnimeOwnage',
    started_year: null,
    ended_year: Number.NaN,
    roles: ['Encoding'],
  },
]

describe('PreviousContributionsSection', () => {
  it('keeps previous contributions collapsed until the visitor asks for them', async () => {
    const { PreviousContributionsSection } = await loadPreviousContributionsSection()

    render(<PreviousContributionsSection items={previousItems} totalCount={1} />)

    expect(screen.getByRole('button', { name: 'Frühere Mitwirkungen anzeigen (1)' })).not.toBeNull()
    expect(screen.queryByText('Archiv der Sterne')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Frühere Mitwirkungen anzeigen (1)' }))

    const list = screen.getByRole('list', { name: 'Frühere Mitwirkungen' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(1)
    expect(screen.getByText('Archiv der Sterne')).not.toBeNull()
    expect(screen.getByText('2014-2017')).not.toBeNull()
  })

  it('omits no-period rows and does not render archive navigation', async () => {
    const { PreviousContributionsSection } = await loadPreviousContributionsSection()

    render(<PreviousContributionsSection items={previousItems} totalCount={1} />)
    fireEvent.click(screen.getByRole('button', { name: 'Frühere Mitwirkungen anzeigen (1)' }))

    expect(screen.queryByText('Ohne Jahr darf nicht erscheinen')).toBeNull()
    expect(screen.queryByText('ohne Jahr')).toBeNull()
    expect(screen.queryByRole('link', { name: /Archiv|Alle Mitwirkungen/i })).toBeNull()
  })

})

it('Phase 120 RED: keeps previous contributions accessible beneath an aria-hidden shell', async () => {
    const { PreviousContributionsSection } = await loadPreviousContributionsSection()
    const { container } = render(
      <PreviousContributionsSection items={previousItems} totalCount={1} />,
    )

    expect(screen.getByRole('heading', { name: 'Frühere Mitwirkungen' })).not.toBeNull()
    const toggle = screen.getByRole('button', { name: 'Frühere Mitwirkungen anzeigen (1)' })
    expect(toggle).not.toBeNull()
    const shell = container.querySelector(':scope > section > [aria-hidden="true"]')
    expect(shell).not.toBeNull()
    expect(shell?.querySelectorAll('[role], a, button')).toHaveLength(0)
    expect(shell?.textContent).not.toContain('Archiv der Sterne')

    fireEvent.click(toggle)
    const list = screen.getByRole('list', { name: 'Frühere Mitwirkungen' })
    expect(within(list).getByText('Archiv der Sterne')).not.toBeNull()
    expect(previousContributionStyles).toMatch(/opacity:\s*[01](?:\.\d+)?;/)
    expect(previousContributionStyles).toMatch(/visibility:\s*(?:visible|hidden);/)
    expect(previousContributionStyles).not.toMatch(/transition:[^;]*(?:width|height|min-height|padding|margin|transform)/)
})
