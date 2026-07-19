// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { MemberProfileData } from '@/types/profile'

const apiClientFetchMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/api', () => ({
  apiClientFetch: (...args: unknown[]) => apiClientFetchMock(...args),
}))

vi.mock('@/components/media/crop/Team4sCropper', () => ({
  Team4sCropper: ({ file }: { file: File }) => <div data-testid="profile-background-cropper">{file.name}</div>,
}))

import { ProfileBackgroundCard } from './ProfileBackgroundCard'

const profile = {
  capabilities: { can_edit_own_profile: true },
} as unknown as MemberProfileData

afterEach(() => {
  cleanup()
  apiClientFetchMock.mockReset()
})

describe('ProfileBackgroundCard', () => {
  it('loads an existing background through the central API client before cropping', async () => {
    const blob = new Blob(['background'], { type: 'image/png' })
    apiClientFetchMock.mockResolvedValue({
      ok: true,
      blob: vi.fn().mockResolvedValue(blob),
    })

    render(
      <ProfileBackgroundCard
        profile={profile}
        backgroundURL="/media/background-preview.jpg"
        sourceBackgroundURL="/media/background-source.png"
        isUploading={false}
        onBackgroundSelected={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Ausschnitt bearbeiten' }))

    await waitFor(() => {
      expect(apiClientFetchMock).toHaveBeenCalledWith('/media/background-source.png')
      expect(screen.getByTestId('profile-background-cropper').textContent).toBe('background-source.png')
    })
  })

  it('preserves the existing public error when the source cannot be loaded', async () => {
    apiClientFetchMock.mockResolvedValue({ ok: false })

    render(
      <ProfileBackgroundCard
        profile={profile}
        backgroundURL="/media/background-preview.jpg"
        sourceBackgroundURL="/media/background-source.png"
        isUploading={false}
        onBackgroundSelected={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Ausschnitt bearbeiten' }))

    expect((await screen.findByRole('alert')).textContent).toBe('Hintergrundbild konnte nicht geladen werden.')
  })
})
