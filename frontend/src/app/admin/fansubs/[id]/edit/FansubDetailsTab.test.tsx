// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import { FansubDetailsTab } from './FansubDetailsTab'
import type { FansubGroupCapabilities } from '@/types/fansub'
import type { FansubDetailsForm } from './useFansubDetailsForm'

vi.mock('./GroupMediaReviewSection', () => ({
  GroupMediaReviewSection: () => <div data-testid="group-media-review-section" />,
}))

vi.mock('./UserSuggestionsInbox', () => ({
  UserSuggestionsInbox: () => <div data-testid="user-suggestions-inbox" />,
}))

vi.mock('./FansubAppMembersSection', () => ({
  FansubAppMembersSection: () => <div data-testid="fansub-app-members-section" />,
}))

vi.mock('./FansubBasicInfoTab', () => ({
  FansubBasicInfoTab: () => <div data-testid="fansub-basic-info-tab" />,
}))

vi.mock('./FansubCommunityLinksList', () => ({
  FansubCommunityLinksList: () => <div data-testid="fansub-community-links-list" />,
}))

const styles = new Proxy({}, {
  get: (_target, property) => String(property),
}) as Record<string, string>

const capabilities: FansubGroupCapabilities = {
  can_edit_group: true,
  can_manage_links: true,
  can_view_members: true,
  can_manage_members: true,
  can_edit_notes: true,
  can_view_invitations: true,
  can_create_invitation: true,
  can_cancel_invitation: true,
  can_view_releases: true,
  can_view_release_media: true,
  can_upload_release_media: true,
  can_edit_release_notes: true,
  can_view_group_media: true,
  can_upload_group_media: true,
  can_update_group_media: true,
  can_delete_group_media: true,
}

function createDetails(): FansubDetailsForm {
  return {
    links: [],
    setLinks: vi.fn(),
    linkErrors: {},
    saving: false,
    invalid: false,
    save: vi.fn((event?: { preventDefault?: () => void }) => {
      event?.preventDefault?.()
    }),
  } as unknown as FansubDetailsForm
}

describe('FansubDetailsTab', () => {
  it('blendet den allgemeinen Gruppen-Speichern-Button im Medien-Tab aus', () => {
    render(
      <FansubDetailsTab
        styles={styles}
        details={createDetails()}
        fansubID={88}
        group={null}
        capabilities={capabilities}
        isPlatformAdmin={false}
        hasAuthSession
        isClientInitialized
        activeMainTab="media"
        error={null}
        onToast={vi.fn()}
        isSectionOpen={() => true}
        onSectionToggle={vi.fn()}
      />,
    )

    expect(screen.getByTestId('group-media-review-section')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /^Speichern$/ })).toBeNull()
  })
})
