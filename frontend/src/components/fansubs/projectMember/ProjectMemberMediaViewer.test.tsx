// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ProjectMemberMediaItem } from '@/types/projectMember'

import { ProjectMemberMediaViewer } from './ProjectMemberMediaViewer'

afterEach(() => cleanup())

const media = (overrides: Partial<ProjectMemberMediaItem> = {}): ProjectMemberMediaItem => ({
  media_asset_id: 1,
  category: 'screenshot',
  caption: 'Ending-Frame',
  episode_label: '08',
  release_version_label: '1',
  release_version_id: 41,
  created_at: '2024-04-12T00:00:00Z',
  thumbnail_url: '/media/t.jpg',
  preview_url: '/media/p.jpg',
  ...overrides,
})

const items = [
  media({ media_asset_id: 1, episode_label: '08', release_version_id: 41 }),
  media({ media_asset_id: 2, episode_label: '09', release_version_id: 42 }),
  media({ media_asset_id: 3, episode_label: '10', release_version_id: 43 }),
]

function renderViewer(index = 0) {
  const onClose = vi.fn()
  const onIndexChange = vi.fn()
  render(
    <ProjectMemberMediaViewer
      items={items}
      index={index}
      projectPath="/fansubs/c-subs/fansubprojekt/vipers-creed"
      memberDisplayName="CSubs Leader"
      onClose={onClose}
      onIndexChange={onIndexChange}
    />,
  )
  return { onClose, onIndexChange }
}

describe('ProjectMemberMediaViewer', () => {
  it('renders the sidebar metadata, release link and n/N counter for the current item', () => {
    renderViewer(0)
    expect(screen.getByRole('dialog', { name: 'Medienansicht' })).not.toBeNull()
    expect(screen.getByText('Release-Screenshot')).not.toBeNull()
    expect(screen.getByText('Folge 08 · 1')).not.toBeNull()
    expect(screen.getByText('Von CSubs Leader')).not.toBeNull()
    expect(screen.getByText('12.04.2024')).not.toBeNull()
    expect(screen.getByText('Ending-Frame')).not.toBeNull()
    expect(screen.getByText('1 / 3')).not.toBeNull()
    const link = screen.getByRole('link', { name: 'Release öffnen →' })
    expect(link.getAttribute('href')).toBe(
      '/fansubs/c-subs/fansubprojekt/vipers-creed/releases/41',
    )
  })

  it('moves focus into the dialog on open', () => {
    renderViewer(0)
    expect(document.activeElement).not.toBe(document.body)
  })

  it('navigates with the Prev/Next buttons (with wrap-around)', () => {
    const { onIndexChange } = renderViewer(0)
    fireEvent.click(screen.getByLabelText('Nächstes Bild'))
    expect(onIndexChange).toHaveBeenCalledWith(1)
    fireEvent.click(screen.getByLabelText('Vorheriges Bild'))
    expect(onIndexChange).toHaveBeenCalledWith(2)
  })

  it('navigates with ArrowLeft/ArrowRight and closes on Escape', () => {
    const { onIndexChange, onClose } = renderViewer(1)
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(onIndexChange).toHaveBeenCalledWith(2)
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(onIndexChange).toHaveBeenCalledWith(0)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('closes when the close button is used', () => {
    const { onClose } = renderViewer(0)
    fireEvent.click(screen.getByLabelText('Schließen'))
    expect(onClose).toHaveBeenCalled()
  })
})
