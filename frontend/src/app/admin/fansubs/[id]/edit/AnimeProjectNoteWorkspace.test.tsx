// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

const getAnimeFansubProjectNoteMock = vi.fn()
const upsertAnimeFansubProjectNoteMock = vi.fn()

vi.mock('@/components/editor', () => ({
  RichTextEditor: () => <textarea />,
  RichTextRenderer: ({ bodyHtml }: { bodyHtml?: string | null }) => (
    <div dangerouslySetInnerHTML={{ __html: bodyHtml ?? '' }} />
  ),
}))

vi.mock('@/lib/api', () => ({
  ApiError: class ApiError extends Error {},
  getAnimeFansubProjectNote: (...args: unknown[]) => getAnimeFansubProjectNoteMock(...args),
  upsertAnimeFansubProjectNote: (...args: unknown[]) => upsertAnimeFansubProjectNoteMock(...args),
}))

import { AnimeProjectNoteWorkspace } from './AnimeProjectNoteWorkspace'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('AnimeProjectNoteWorkspace', () => {
  it('zeigt fehlenden Projekt-Einblick wenn der API-Read null liefert', async () => {
    getAnimeFansubProjectNoteMock.mockResolvedValue(null)

    render(<AnimeProjectNoteWorkspace fansubId={1} animeId={13} expanded />)

    expect(await screen.findByText('Projekt-Einblick fehlt')).not.toBeNull()
    expect(screen.queryByText('Wird geladen…')).toBeNull()
    expect(getAnimeFansubProjectNoteMock).toHaveBeenCalledWith(1, 13)
  })
})
