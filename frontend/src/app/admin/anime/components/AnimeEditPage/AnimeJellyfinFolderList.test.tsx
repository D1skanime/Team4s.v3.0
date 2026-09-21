// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { removeAdminAnimeJellyfinFolder } from '@/lib/api'

import { AnimeJellyfinFolderList } from './AnimeJellyfinFolderList'

vi.mock('@/lib/api', () => ({
  ApiError: class ApiError extends Error {
    status: number
    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  },
  removeAdminAnimeJellyfinFolder: vi.fn(),
}))

const mockedRemoveFolder = vi.mocked(removeAdminAnimeJellyfinFolder)

afterEach(() => {
  cleanup()
})

describe('AnimeJellyfinFolderList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the main folder without any remove action', () => {
    render(
      <AnimeJellyfinFolderList
        animeID={7}
        folders={[{ jellyfin_item_id: 'abc', is_main: true }]}
        onFolderRemoved={vi.fn()}
      />,
    )

    expect(screen.getByText('Haupt-Ordner')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Ordner entfernen/ })).toBeNull()
  })

  it('renders an additional folder with a remove button and no window.confirm usage', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm')
    mockedRemoveFolder.mockResolvedValue(undefined)

    render(
      <AnimeJellyfinFolderList
        animeID={7}
        folders={[
          { jellyfin_item_id: 'abc', is_main: true },
          { jellyfin_item_id: 'def', is_main: false },
        ]}
        onFolderRemoved={vi.fn()}
      />,
    )

    expect(screen.getByText('Zusatz-Ordner')).toBeTruthy()
    const removeButton = screen.getByRole('button', { name: 'Ordner entfernen' })
    expect(removeButton).toBeTruthy()

    await act(async () => {
      fireEvent.click(removeButton)
    })
    expect(confirmSpy).not.toHaveBeenCalled()

    confirmSpy.mockRestore()
  })

  it('shows a loading label during removal, calls the API, and shows a success line on completion', async () => {
    let resolveRemoval: () => void = () => {}
    mockedRemoveFolder.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveRemoval = resolve
        }),
    )

    const onFolderRemoved = vi.fn()

    render(
      <AnimeJellyfinFolderList
        animeID={7}
        folders={[
          { jellyfin_item_id: 'abc', is_main: true },
          { jellyfin_item_id: 'def', is_main: false },
        ]}
        onFolderRemoved={onFolderRemoved}
      />,
    )

    const removeButton = screen.getByRole('button', { name: 'Ordner entfernen' })
    fireEvent.click(removeButton)

    await waitFor(() => {
      const loadingButton = screen.getByRole('button', { name: 'Wird entfernt…' }) as HTMLButtonElement
      expect(loadingButton.disabled).toBe(true)
    })
    expect(mockedRemoveFolder).toHaveBeenCalledWith(7, 'def')

    resolveRemoval()

    await waitFor(() => {
      expect(screen.queryByText('Zusatz-Ordner')).toBeNull()
    })

    const status = screen.getByRole('status')
    expect(status.textContent).toBe('Ordner entfernt. Der Eintrag erscheint wieder als „offen" in der Bibliothek.')
    expect(onFolderRemoved).toHaveBeenCalledTimes(1)
  })

  it('renders nothing when folders is empty or undefined', () => {
    const { container: emptyContainer } = render(
      <AnimeJellyfinFolderList animeID={7} folders={[]} onFolderRemoved={vi.fn()} />,
    )
    expect(emptyContainer.innerHTML).toBe('')

    const { container: undefinedContainer } = render(
      <AnimeJellyfinFolderList animeID={7} folders={undefined} onFolderRemoved={vi.fn()} />,
    )
    expect(undefinedContainer.innerHTML).toBe('')
  })
})
