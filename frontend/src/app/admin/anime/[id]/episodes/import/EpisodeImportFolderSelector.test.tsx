// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { JellyfinFolderOption } from '@/types/episodeImport'

import { EpisodeImportFolderSelector } from './EpisodeImportFolderSelector'

describe('EpisodeImportFolderSelector', () => {
  it('renders nothing when given a single folder', () => {
    const folders: JellyfinFolderOption[] = [{ jellyfin_item_id: 'abc', is_main: true }]

    const { container } = render(
      <EpisodeImportFolderSelector folders={folders} value={null} onChange={vi.fn()} />,
    )

    expect(container.innerHTML).toBe('')
  })

  it('renders nothing when given no folders', () => {
    const { container } = render(
      <EpisodeImportFolderSelector folders={[]} value={null} onChange={vi.fn()} />,
    )

    expect(container.innerHTML).toBe('')
  })

  it('renders a FormField/Select with one option per folder, main folder selected by default, and calls onChange on selection', () => {
    const folders: JellyfinFolderOption[] = [
      { jellyfin_item_id: 'abc', is_main: true },
      { jellyfin_item_id: 'def', is_main: false },
    ]
    const onChange = vi.fn()

    render(<EpisodeImportFolderSelector folders={folders} value={null} onChange={onChange} />)

    expect(screen.getByText('Jellyfin-Ordner')).not.toBeNull()
    const select = screen.getByLabelText('Jellyfin-Ordner') as HTMLSelectElement
    expect(select).not.toBeNull()
    expect(select.value).toBe('abc')

    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(2)
    expect(options.map((option) => option.textContent)).toEqual(['abc', 'def'])

    fireEvent.change(select, { target: { value: 'def' } })
    expect(onChange).toHaveBeenCalledWith('def')
  })

  it('respects an explicit selected value over the main folder default', () => {
    const folders: JellyfinFolderOption[] = [
      { jellyfin_item_id: 'abc', is_main: true },
      { jellyfin_item_id: 'def', is_main: false },
    ]

    render(<EpisodeImportFolderSelector folders={folders} value="def" onChange={vi.fn()} />)

    const select = screen.getByLabelText('Jellyfin-Ordner') as HTMLSelectElement
    expect(select.value).toBe('def')
  })
})
