// @vitest-environment jsdom
//
// Plan 138-16 (D-06/D-09/D-34): FansubEditClient builds the "Claims dieser Gruppe ansehen"
// link-out to the central /admin/claims workspace (Plan 138-10) and forwards it into the
// collaboration tab's tree — WITHOUT altering the existing invitations/collaboration tabs'
// own content or behavior otherwise. These tests isolate that wiring: all heavy child
// sections/hooks are stubbed (mirrors page.test.tsx's own mocking style for the same
// component tree), so only the claimsLinkOut construction/gating is under test.

import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

vi.mock('@/lib/useAuthSession', () => ({
  useAuthSession: () => ({
    hasAccessToken: true,
    hasRefreshToken: false,
    isClientInitialized: true,
  }),
}))

vi.mock('@/components/admin/MediaUpload', () => ({
  buildMediaPreviewURL: () => '',
}))

const mockActiveMainTab = vi.hoisted(() => ({ value: 'collaboration' as string }))

vi.mock('./hooks/useFansubEditMainTab', () => ({
  useFansubEditMainTab: () => ({
    activeMainTab: mockActiveMainTab.value,
    availableMainTabs: [],
    handleMainTabChange: vi.fn(),
  }),
}))

vi.mock('./hooks/useFansubEditGroupLoad', () => ({
  useFansubEditGroupLoad: () => ({ loading: false }),
}))

vi.mock('./hooks/useFansubEditMobileSections', () => ({
  useFansubEditMobileSections: () => ({
    isSectionOpen: () => false,
    onSectionToggle: vi.fn(),
  }),
}))

vi.mock('./useFansubDetailsForm', () => ({
  useFansubDetailsForm: () => ({
    form: { name: 'SubGroup' },
    logoMedia: null,
    bannerMedia: null,
    applyGroup: vi.fn(),
    setAliasesFromLoad: vi.fn(),
    links: [],
    setLinks: vi.fn(),
    linkErrors: {},
    saving: false,
    invalid: false,
    save: vi.fn(),
  }),
}))

vi.mock('./useFansubReleaseData', () => ({
  useFansubReleaseData: () => ({
    setExpandedAnimeKeys: vi.fn(),
    setExpandedReleaseIds: vi.fn(),
    releaseSegmentCards: {},
    setReleaseSegmentCards: vi.fn(),
    setReleaseSegmentErrors: vi.fn(),
    selectedReleaseSegment: null,
    setSelectedReleaseSegment: vi.fn(),
    loadReleaseSegmentCards: vi.fn(),
    loadAnimeReleases: vi.fn(),
    refreshAnimeCoverage: vi.fn(),
    invalidateReleaseDataRequests: vi.fn(),
    resetReleaseDataState: vi.fn(),
    animeCoverageMap: new Map(),
  }),
}))

vi.mock('./useReleaseContributions', () => ({
  useReleaseContributions: () => ({
    loadAnimeContributionRows: vi.fn(),
    resetContributionsState: vi.fn(),
  }),
}))

vi.mock('./useReleaseMediaDrawer', () => ({
  useReleaseMediaDrawer: () => ({
    openReleaseDrawer: vi.fn(),
    openThemeDrawer: vi.fn(),
    resetDrawerState: vi.fn(),
    invalidateDrawerRequests: vi.fn(),
  }),
}))

vi.mock('./ReleaseMediaDrawer', () => ({
  ReleaseMediaDrawer: () => <div data-testid="release-media-drawer" />,
}))

const workspaceSectionProps = vi.hoisted(() => [] as Array<Record<string, unknown>>)
vi.mock('./sections/FansubEditWorkspaceSection', () => ({
  FansubEditWorkspaceSection: (props: Record<string, unknown>) => {
    workspaceSectionProps.push(props)
    return <div data-testid="claims-link-out-slot">{props.claimsLinkOut as ReactNode}</div>
  },
}))

import { FansubEditClient } from './FansubEditClient'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  workspaceSectionProps.length = 0
  mockActiveMainTab.value = 'collaboration'
})

describe('FansubEditClient — Claims-Link-out (D-06/D-09/D-34)', () => {
  it('rendert einen Link zur zentralen Claims-Fläche für Plattform-Admins im collaboration-Tab', () => {
    render(<FansubEditClient fansubID={88} isPlatformAdmin capabilities={null} />)

    const link = screen.getByRole('link', { name: 'Claims dieser Gruppe ansehen' })
    expect(link.getAttribute('href')).toBe('/admin/claims?fansub_group_id=88')
  })

  it('rendert keinen Claims-Link außerhalb des collaboration-Tabs', () => {
    mockActiveMainTab.value = 'basic'

    render(<FansubEditClient fansubID={88} isPlatformAdmin capabilities={null} />)

    expect(screen.queryByRole('link', { name: 'Claims dieser Gruppe ansehen' })).toBeNull()
  })

  it('rendert keinen Claims-Link für Nicht-Plattform-Admins (Ziel liegt hinter PlatformAdminGate)', () => {
    render(<FansubEditClient fansubID={88} isPlatformAdmin={false} capabilities={null} />)

    expect(screen.queryByRole('link', { name: 'Claims dieser Gruppe ansehen' })).toBeNull()
  })
})
