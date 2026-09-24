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
    expect(options.map((option) => option.textContent)).toEqual(['abc (Haupt-Ordner)', 'def'])

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

  it('renders folder_display_name as the option label when present', () => {
    const folders: JellyfinFolderOption[] = [
      { jellyfin_item_id: 'abc', is_main: true, folder_display_name: 'Hauptordner' },
      { jellyfin_item_id: 'def', is_main: false, folder_display_name: 'Extras' },
    ]

    render(<EpisodeImportFolderSelector folders={folders} value={null} onChange={vi.fn()} />)

    const options = screen.getAllByRole('option')
    expect(options.map((option) => option.textContent)).toEqual(['Hauptordner (Haupt-Ordner)', 'Extras'])
  })

  it('falls back to the last Windows-style path segment and sets the full path as the title tooltip', () => {
    const folders: JellyfinFolderOption[] = [
      { jellyfin_item_id: 'abc', is_main: true, folder_path: 'D:\\Anime\\Show\\Main' },
      { jellyfin_item_id: 'def', is_main: false, folder_path: 'D:\\Anime\\Show\\Extras' },
    ]

    render(<EpisodeImportFolderSelector folders={folders} value={null} onChange={vi.fn()} />)

    const options = screen.getAllByRole('option')
    expect(options[1].textContent).toBe('Extras')
    expect(options[1].getAttribute('title')).toBe('D:\\Anime\\Show\\Extras')
  })

  it('marks the main folder label with "(Haupt-Ordner)"', () => {
    const folders: JellyfinFolderOption[] = [
      { jellyfin_item_id: 'abc', is_main: true, folder_display_name: 'Hauptordner' },
      { jellyfin_item_id: 'def', is_main: false, folder_display_name: 'Extras' },
    ]

    render(<EpisodeImportFolderSelector folders={folders} value={null} onChange={vi.fn()} />)

    const options = screen.getAllByRole('option')
    expect(options[0].textContent).toBe('Hauptordner (Haupt-Ordner)')
  })

  it('falls back to the raw jellyfin_item_id when neither folder_display_name nor folder_path is set', () => {
    const folders: JellyfinFolderOption[] = [
      { jellyfin_item_id: 'abc', is_main: true },
      { jellyfin_item_id: 'def', is_main: false },
    ]

    render(<EpisodeImportFolderSelector folders={folders} value={null} onChange={vi.fn()} />)

    const options = screen.getAllByRole('option')
    expect(options.map((option) => option.textContent)).toEqual(['abc (Haupt-Ordner)', 'def'])
  })
})
