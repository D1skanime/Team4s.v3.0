// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

import type { UseReleaseVersionMediaResult } from '@/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia'

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}))

const mockedUseReleaseVersionMedia = vi.fn<() => UseReleaseVersionMediaResult>()

vi.mock('@/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia', () => ({
  useReleaseVersionMedia: () => mockedUseReleaseVersionMedia(),
}))

import { ReleaseVersionMediaDrawerSummary } from './ReleaseVersionMediaDrawerSummary'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function makeMediaState(): UseReleaseVersionMediaResult {
  return {
    items: [],
    isLoading: false,
    error: null,
    reload: vi.fn(),
    uploadItems: [],
    startUpload: vi.fn().mockResolvedValue(undefined),
    retryUpload: vi.fn().mockResolvedValue(undefined),
    clearUploadQueue: vi.fn(),
    patchItem: vi.fn().mockResolvedValue(undefined),
    deleteItem: vi.fn().mockResolvedValue(undefined),
    reorderItems: vi.fn().mockResolvedValue(undefined),
    patchError: null,
    deleteError: null,
  }
}

describe('ReleaseVersionMediaDrawerSummary', () => {
  it('renders the Media verwalten CTA with the release-version editor link', () => {
    mockedUseReleaseVersionMedia.mockReturnValue(makeMediaState())

    render(
      <ReleaseVersionMediaDrawerSummary
        versionId={1}
        fansubName="SubGroup"
        releaseVersionLabel="v1"
      />,
    )

    const link = screen.getByRole('link', { name: 'Media verwalten' })
    expect(link.getAttribute('href')).toContain('/admin/episode-versions/1/edit')
  })

  it('does not render upload controls inside the drawer summary', () => {
    mockedUseReleaseVersionMedia.mockReturnValue(makeMediaState())

    const { container } = render(
      <ReleaseVersionMediaDrawerSummary
        versionId={1}
        fansubName="SubGroup"
        releaseVersionLabel="v1"
      />,
    )

    expect(container.querySelector('input[type="file"]')).toBeNull()
    expect(screen.queryByText(/hochladen|Datei auswaehlen/i)).toBeNull()
  })

  it('treats a null media payload like an empty drawer summary instead of crashing', () => {
    mockedUseReleaseVersionMedia.mockReturnValue({
      ...makeMediaState(),
      items: null as unknown as UseReleaseVersionMediaResult['items'],
    })

    render(
      <ReleaseVersionMediaDrawerSummary
        versionId={41}
        fansubName="SubGroup"
        releaseVersionLabel="v1"
      />,
    )

    expect(screen.getByRole('link', { name: 'Media verwalten' })).not.toBeNull()
    expect(screen.getByText(/Release-Screenshot:/i)).not.toBeNull()
  })
})
