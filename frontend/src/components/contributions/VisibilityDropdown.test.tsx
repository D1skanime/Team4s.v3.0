// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { VisibilityDropdown } from './VisibilityDropdown'

const apiMocks = vi.hoisted(() => ({
  patchAnimeContributionVisibility: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  patchAnimeContributionVisibility: apiMocks.patchAnimeContributionVisibility,
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('VisibilityDropdown', () => {
  it('speichert über den bestehenden Helper und meldet den neuen Status', async () => {
    apiMocks.patchAnimeContributionVisibility.mockResolvedValue({ message: 'ok' })
    const onChanged = vi.fn()

    render(
      <VisibilityDropdown contributionId={7} isPublic={true} onChanged={onChanged} />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Intern' }))

    await waitFor(() => {
      expect(apiMocks.patchAnimeContributionVisibility).toHaveBeenCalledWith(7, false)
    })
    expect(onChanged).toHaveBeenCalledWith(false)
  })

  it('rendert Profil und Intern als stabilen Sichtbarkeits-Slider', () => {
    render(
      <VisibilityDropdown contributionId={7} isPublic={false} onChanged={vi.fn()} />,
    )

    expect(screen.getByRole('group', { name: 'Sichtbarkeit dieses Eintrags' })).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Profil' }).getAttribute('aria-pressed')).toBe('false')
    expect(screen.getByRole('button', { name: 'Intern' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('group', { name: 'Sichtbarkeit dieses Eintrags' }).getAttribute('data-public')).toBe('false')
  })
})
