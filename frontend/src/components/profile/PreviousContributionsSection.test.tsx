// @vitest-environment jsdom

import type { ComponentType } from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

type PreviousContributionItem = {
  id: string
  anime_title: string
  fansub_group_name: string
  period_label?: string | null
  role_labels: string[]
}

async function loadPreviousContributionsSection(): Promise<{
  PreviousContributionsSection: ComponentType<{
    items: PreviousContributionItem[]
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

const previousItems: PreviousContributionItem[] = [
  {
    id: 'previous-1',
    anime_title: 'Archiv der Sterne',
    fansub_group_name: 'AnimeOwnage',
    period_label: '2014-2017',
    role_labels: ['Übersetzung', 'Timing'],
  },
  {
    id: 'previous-no-period',
    anime_title: 'Ohne Jahr darf nicht erscheinen',
    fansub_group_name: 'AnimeOwnage',
    period_label: null,
    role_labels: ['Encoding'],
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
