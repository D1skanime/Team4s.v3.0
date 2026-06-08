// @vitest-environment jsdom

import type { ImgHTMLAttributes, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'

import type { MemberProfileResponse } from '@/types/profile'

const getOwnProfileMock = vi.fn()
const getMyMemberClaimMock = vi.fn()
const getMyBadgesMock = vi.fn()
const patchMyBadgeVisibilityMock = vi.fn()
const patchNoindexMock = vi.fn()
const refreshActiveAuthSessionMock = vi.fn()
const updateOwnProfileMock = vi.fn()
const uploadOwnProfileAvatarMock = vi.fn()
const uploadOwnProfileBackgroundMock = vi.fn()
const uploadOwnProfileStoryImageMock = vi.fn()
const useAuthSessionMock = vi.hoisted(() => vi.fn())

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode; [key: string]: unknown }) => <a href={href} {...props}>{children}</a>,
}))

vi.mock('next/image', () => ({
  default: ({ alt, unoptimized, ...props }: ImgHTMLAttributes<HTMLImageElement> & { unoptimized?: boolean }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={alt} data-unoptimized={unoptimized ? 'true' : 'false'} {...props} />
  },
}))

vi.mock('@/components/editor', () => ({
  RichTextEditor: ({
    value,
    onChange,
    placeholder,
  }: {
    value: unknown
    onChange: (next: unknown) => void
    placeholder?: string
  }) => (
    <textarea
      aria-label="Meine Fansub-Geschichte Editor"
      placeholder={placeholder}
      value={typeof value === 'object' && value !== null ? JSON.stringify(value) : ''}
      onChange={(event) => onChange({
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Titel' }] },
          { type: 'paragraph', content: [{ type: 'text', text: event.target.value, marks: [{ type: 'textStyle', attrs: { colorToken: 'red' } }] }] },
          { type: 'table', content: [{ type: 'tableRow', content: [{ type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Zelle' }] }] }] }] },
        ],
      })}
    />
  ),
  RichTextRenderer: ({ bodyHtml }: { bodyHtml?: string | null }) => (
    <div data-testid="story-renderer" dangerouslySetInnerHTML={{ __html: bodyHtml || '' }} />
  ),
}))

vi.mock('@/components/media/crop/AvatarCropDialog', () => ({
  AvatarCropDialog: ({
    file,
    onApply,
    onCancel,
  }: {
    file: File
    onApply: (payload: { sourceFile: File; croppedFile: File }) => void
    onCancel: () => void
  }) => (
    <div role="dialog" aria-label="Avatar zuschneiden">
      <button type="button" onClick={() => onApply({ sourceFile: file, croppedFile: new File(['cropped'], 'avatar.png', { type: 'image/png' }) })}>
        Ausschnitt übernehmen
      </button>
      <button type="button" onClick={onCancel}>Abbrechen</button>
    </div>
  ),
}))

vi.mock('@/components/media/crop/Team4sCropper', () => ({
  Team4sCropper: ({
    title,
    output,
    onApply,
    onCancel,
  }: {
    title: string
    output: { width: number; height: number }
    onApply: (croppedFile: File) => void
    onCancel: () => void
  }) => (
    <div role="dialog" aria-label={title}>
      <span data-testid="cropper-output-size">{output.width}x{output.height}</span>
      <button type="button" onClick={() => onApply(new File(['background'], 'background.jpg', { type: 'image/jpeg' }))}>
        Ausschnitt übernehmen
      </button>
      <button type="button" onClick={onCancel}>Abbrechen</button>
    </div>
  ),
}))

vi.mock('@/lib/useAuthSession', () => ({
  useAuthSession: () => useAuthSessionMock(),
}))

vi.mock('@/lib/api', () => ({
  API_AUTH_SESSION_TOKEN: 'runtime-auth',
  AUTH_SESSION_CHANGED_EVENT: 'team4s:auth-session-changed',
  ApiError: class ApiError extends Error {
    status: number
    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  },
  getAuthSessionSnapshot: () => ({ hasAccessToken: true, hasRefreshToken: true, displayName: 'Test User' }),
  getMyBadges: (...args: unknown[]) => getMyBadgesMock(...args),
  getMyMemberClaim: (...args: unknown[]) => getMyMemberClaimMock(...args),
  getOwnProfile: (...args: unknown[]) => getOwnProfileMock(...args),
  patchMyBadgeVisibility: (...args: unknown[]) => patchMyBadgeVisibilityMock(...args),
  patchNoindex: (...args: unknown[]) => patchNoindexMock(...args),
  refreshActiveAuthSession: (...args: unknown[]) => refreshActiveAuthSessionMock(...args),
  updateOwnProfile: (...args: unknown[]) => updateOwnProfileMock(...args),
  uploadOwnProfileAvatar: (...args: unknown[]) => uploadOwnProfileAvatarMock(...args),
  uploadOwnProfileBackground: (...args: unknown[]) => uploadOwnProfileBackgroundMock(...args),
  uploadOwnProfileStoryImage: (...args: unknown[]) => uploadOwnProfileStoryImageMock(...args),
  resolveApiUrl: (value: string) => value,
}))

import { ApiError } from '@/lib/api'

import MyProfilePage from './page'

beforeEach(() => {
  useAuthSessionMock.mockReturnValue({
    authToken: '',
    hasAccessToken: true,
    hasRefreshToken: true,
    displayName: 'Mika',
    isClientInitialized: true,
  })
  getMyMemberClaimMock.mockResolvedValue(null)
  getMyBadgesMock.mockResolvedValue({ badges: [] })
  patchNoindexMock.mockResolvedValue(undefined)
  patchMyBadgeVisibilityMock.mockResolvedValue({ badges: [] })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

function makeProfileResponse(overrides: Partial<MemberProfileResponse['data']> = {}): MemberProfileResponse {
  return {
    data: {
      member_id: 4,
      has_member_profile: true,
      app_user_id: 11,
      legacy_user_id: 8,
      display_name: 'Mika',
      fansub_name: 'MikaFX',
      slug: 'mikafx',
      email: 'mika@example.com',
      keycloak_subject: 'kc-11',
      bio: 'Typesetting und QC.',
      member_story: 'Seit 2016 in mehreren Gruppen aktiv.',
      member_story_json: {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Seit 2016 in mehreren Gruppen aktiv.' }] }],
      },
      member_story_html: '<p>Seit 2016 in mehreren Gruppen aktiv.</p>',
      member_story_text: 'Seit 2016 in mehreren Gruppen aktiv.',
      member_story_editor_type: 'tiptap',
      member_story_content_schema_version: 1,
      active_from_date: '2016-01-01',
      active_until_date: null,
      is_currently_active: true,
      noindex: true,
      is_verified: false,
      claim_status: null,
      claim_member_nick: null,
      profile_visibility: 'members_only',
      avatar: null,
      keycloak_account_url: 'http://localhost:8081/realms/team4s/account',
      capabilities: {
        can_view_own_profile: true,
        can_edit_own_profile: true,
        can_upload_own_avatar: true,
        can_open_keycloak_account: true,
        can_view_memberships: true,
        can_view_historical_credits: true,
      },
      memberships: [{
        fansub_group_id: 88,
        fansub_group_name: 'Phase Fansubs',
        fansub_group_slug: 'phase-fansubs',
        group_status: 'active',
        joined_year: 2016,
        left_year: null,
        app_member_status: 'active',
        app_member_roles: ['typesetter', 'quality_checker'],
        has_historical_link: true,
      }],
      historical_credits: [{
        fansub_group_id: 88,
        fansub_group_name: 'Phase Fansubs',
        role_name: 'typesetter',
        role_label: 'Typesetter',
        release_count: 12,
      }],
      recent_media: [],
      recent_contributions: [],
      created_at: '2026-05-17T10:00:00Z',
      updated_at: '2026-05-17T11:00:00Z',
      account_status: 'active',
      account_display_name: 'Mika',
      account_global_roles: ['user'],
      ...overrides,
    },
  }
}

async function pickActivityYear(label: string, year: string) {
  const control = await screen.findByLabelText(label)
  fireEvent.click(control)

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const yearButton = screen.queryByRole('button', { name: year })
    if (yearButton) {
      fireEvent.click(yearButton)
      return
    }
    const earlierButton = screen.getByRole('button', { name: 'Früher' }) as HTMLButtonElement
    if (earlierButton.disabled) break
    fireEvent.click(earlierButton)
  }

  throw new Error(`Jahr ${year} wurde im Year-Picker nicht gefunden.`)
}

describe('MyProfilePage', () => {
  it('loads the own profile route without admin naming leaks', async () => {
    getOwnProfileMock.mockResolvedValue(makeProfileResponse())

    render(<MyProfilePage />)

    expect(await screen.findByRole('heading', { name: 'Mein Profil' })).not.toBeNull()
    expect(screen.queryByText('/admin/profile')).toBeNull()
    expect(screen.queryByText(/Admin Content/i)).toBeNull()
    expect(screen.getByText('Meine Fansub-Geschichte')).not.toBeNull()
    expect(screen.getByTestId('story-renderer').textContent).toContain('Seit 2016')
    expect(screen.queryByLabelText('Meine Fansub-Geschichte Editor')).toBeNull()
  })

  it('renders an account-only view when no verified member profile is linked', async () => {
    getOwnProfileMock.mockResolvedValue(makeProfileResponse({
      member_id: 0,
      has_member_profile: false,
      display_name: 'Phase Admin',
      fansub_name: '',
      slug: '',
      member_story: null,
      member_story_json: null,
      member_story_html: null,
      member_story_text: null,
      is_verified: false,
      capabilities: {
        can_view_own_profile: true,
        can_edit_own_profile: false,
        can_upload_own_avatar: false,
        can_open_keycloak_account: true,
        can_view_memberships: false,
        can_view_historical_credits: false,
      },
      memberships: [],
      historical_credits: [],
      recent_media: [],
      recent_contributions: [],
      account_display_name: 'Phase Admin',
      account_global_roles: ['platform_admin'],
    }))

    render(<MyProfilePage />)

    expect(await screen.findByRole('heading', { name: 'Mein Account' })).not.toBeNull()
    expect(screen.getByText('Ein normales Konto ist noch kein öffentliches Member-Profil. Suche deinen historischen Nick oder beantrage einen neuen Member-Eintrag.')).not.toBeNull()
    expect(screen.getByLabelText('Historischen Nick suchen')).not.toBeNull()
    expect(screen.getAllByText('Phase Admin').length).toBeGreaterThan(0)
    expect(screen.queryByRole('heading', { name: 'Mein Profil' })).toBeNull()
    expect(screen.queryByLabelText('Fansub-Nick')).toBeNull()
    expect(screen.queryByText('Meine Fansub-Geschichte')).toBeNull()
    expect(screen.queryByText('Avatar-Bild')).toBeNull()
    expect(screen.queryByRole('link', { name: /Öffentliches Profil ansehen/i })).toBeNull()
  })

  it('links from the own profile hub to the public member profile', async () => {
    getOwnProfileMock.mockResolvedValue(makeProfileResponse({ member_id: 4 }))

    render(<MyProfilePage />)

    const publicProfileLink = await screen.findByRole('link', { name: /Öffentliches Profil ansehen/i })
    expect(publicProfileLink.getAttribute('href')).toBe('/members/mikafx')
    expect(publicProfileLink.getAttribute('aria-disabled')).toBe('false')
  })

  it('opens the rich story editor only after Bearbeiten', async () => {
    getOwnProfileMock.mockResolvedValue(makeProfileResponse())

    render(<MyProfilePage />)

    expect(await screen.findByTestId('story-renderer')).not.toBeNull()
    expect(screen.queryByLabelText('Meine Fansub-Geschichte Editor')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Bearbeiten' }))

    expect(screen.getByLabelText('Meine Fansub-Geschichte Editor')).not.toBeNull()
  })

  it('renders protected-route feedback without loading profile data when unauthenticated', async () => {
    useAuthSessionMock.mockReturnValue({
      authToken: '',
      hasAccessToken: false,
      hasRefreshToken: false,
      displayName: '',
      isClientInitialized: true,
    })

    render(<MyProfilePage />)

    expect(await screen.findByText('Anmeldung erforderlich')).not.toBeNull()
    expect(getOwnProfileMock).not.toHaveBeenCalled()
  })

  it('loads profile data when the access cookie expired but refresh session remains', async () => {
    useAuthSessionMock.mockReturnValue({
      authToken: '',
      hasAccessToken: false,
      hasRefreshToken: true,
      displayName: 'Mika',
      isClientInitialized: true,
    })
    getOwnProfileMock.mockResolvedValue(makeProfileResponse())

    render(<MyProfilePage />)

    expect(await screen.findByRole('heading', { name: 'Mein Profil' })).not.toBeNull()
    expect(getOwnProfileMock).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Anmeldung erforderlich')).toBeNull()
  })

  it('shows the login action when the profile session is rejected', async () => {
    getOwnProfileMock.mockRejectedValue(new ApiError(401, 'Session abgelaufen.'))

    render(<MyProfilePage />)

    expect(await screen.findByText('Anmeldung erforderlich')).not.toBeNull()
    expect(screen.getByText('Anmeldung erforderlich. Bitte melde dich erneut an.')).not.toBeNull()
    expect(screen.getByRole('link', { name: 'Zur Anmeldung' }).getAttribute('href')).toBe('/login')
  })

  it('does not keep the profile loader forever when the request stalls', async () => {
    vi.useFakeTimers()
    getOwnProfileMock.mockReturnValue(new Promise(() => undefined))

    render(<MyProfilePage />)

    expect(screen.getByText('Profil wird geladen')).not.toBeNull()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000)
    })

    expect(screen.getByText('Profil konnte nicht geladen werden')).not.toBeNull()
    expect(screen.getByText('Profil konnte nicht rechtzeitig geladen werden. Bitte melde dich erneut an.')).not.toBeNull()
  })

  it('keeps the account display name out of editable profile fields until Team4s data changes', async () => {
    getOwnProfileMock.mockResolvedValue(makeProfileResponse({
      account_display_name: 'Mika Account',
      display_name: 'Mika Legacy Display',
      fansub_name: 'MikaFX',
    }))

    render(<MyProfilePage />)

    expect(await screen.findByLabelText('Fansub-Nick')).not.toBeNull()
    expect(screen.queryByLabelText('Anzeigename')).toBeNull()
    expect(screen.getAllByText('Mika Account').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /Profil speichern/i })).toHaveProperty('disabled', true)
  })

  it('disables search indexing changes until the member claim is verified', async () => {
    getOwnProfileMock.mockResolvedValue(makeProfileResponse({
      claim_status: null,
      noindex: true,
    }))

    render(<MyProfilePage />)

    const indexToggle = await screen.findByRole('checkbox', { name: 'Mein Profil von Suchmaschinen indexieren lassen' })
    expect(indexToggle).toHaveProperty('disabled', true)
    expect(screen.getByText('Die Indexierung kann erst nach einem verifizierten Member-Claim geändert werden.')).not.toBeNull()
  })

  it('saves search indexing changes immediately for verified member claims', async () => {
    getOwnProfileMock.mockResolvedValue(makeProfileResponse({
      claim_status: 'verified',
      claim_member_nick: 'MikaFX',
      noindex: true,
    }))

    render(<MyProfilePage />)

    fireEvent.click(await screen.findByRole('checkbox', { name: 'Mein Profil von Suchmaschinen indexieren lassen' }))

    await waitFor(() => {
      expect(patchNoindexMock).toHaveBeenCalledWith(false, undefined)
    })
    expect(await screen.findByText('Sichtbarkeitseinstellung wurde gespeichert.')).not.toBeNull()
  })

  it('hides the member claim action card once the member claim is verified', async () => {
    getOwnProfileMock.mockResolvedValue(makeProfileResponse({
      claim_status: 'verified',
      claim_member_nick: 'UAT66-Claim-202952',
    }))

    render(<MyProfilePage />)

    expect(await screen.findByText('Du bist als UAT66-Claim-202952 verifiziert.')).not.toBeNull()
    expect(screen.queryByText('Member-Claim')).toBeNull()
    expect(screen.queryByText('Historischen Nick suchen')).toBeNull()
  })

  it('treats is_verified as verified claim status when claim_status is absent', async () => {
    getOwnProfileMock.mockResolvedValue(makeProfileResponse({
      is_verified: true,
      claim_status: null,
      noindex: false,
      fansub_name: 'ClaimNick',
    }))

    render(<MyProfilePage />)

    const indexToggle = await screen.findByRole('checkbox', { name: 'Mein Profil von Suchmaschinen indexieren lassen' })
    expect(indexToggle).toHaveProperty('disabled', false)
    expect(screen.getByText('Du bist als ClaimNick verifiziert.')).not.toBeNull()
  })

  it('renders aggregate load errors honestly', async () => {
    getOwnProfileMock.mockRejectedValue(new Error('Profil API nicht erreichbar'))

    render(<MyProfilePage />)

    expect(await screen.findByText('Profil konnte nicht geladen werden')).not.toBeNull()
    expect(screen.getByText('Profil API nicht erreichbar')).not.toBeNull()
  })

  it('saves edited Team4s profile fields and keeps account fields read-only', async () => {
    getOwnProfileMock.mockResolvedValue(makeProfileResponse())
    updateOwnProfileMock.mockResolvedValue(makeProfileResponse({ fansub_name: 'MikaNova' }))

    render(<MyProfilePage />)

    const input = await screen.findByLabelText('Fansub-Nick')
    fireEvent.change(input, { target: { value: 'MikaNova' } })
    fireEvent.click(screen.getByRole('button', { name: 'Profil speichern' }))

    await waitFor(() => {
      expect(updateOwnProfileMock).toHaveBeenCalledWith(expect.objectContaining({
        fansub_name: 'MikaNova',
        active_from_date: '2016-01-01',
        active_until_date: null,
      }))
    })
    const payload = updateOwnProfileMock.mock.calls[0]?.[0] as Record<string, unknown>
    expect(payload.display_name).toBeUndefined()
    expect(payload.email).toBeUndefined()
    expect(payload.keycloak_subject).toBeUndefined()
    expect(await screen.findByText('Profil wurde gespeichert.')).not.toBeNull()
  })

  it('saves selected activity years as normalized dates', async () => {
    getOwnProfileMock.mockResolvedValue(makeProfileResponse({
      is_currently_active: false,
      active_until_date: '2019-01-01',
    }))
    updateOwnProfileMock.mockResolvedValue(makeProfileResponse({
      is_currently_active: false,
      active_from_date: '2015-01-01',
      active_until_date: '2020-01-01',
    }))

    render(<MyProfilePage />)

    await pickActivityYear('Aktiv seit', '2015')
    await pickActivityYear('Aktiv bis', '2020')
    fireEvent.click(screen.getByRole('button', { name: 'Profil speichern' }))

    await waitFor(() => {
      expect(updateOwnProfileMock).toHaveBeenCalledWith(expect.objectContaining({
        active_from_date: '2015-01-01',
        active_until_date: '2020-01-01',
        is_currently_active: false,
      }))
    })
  })

  it('clears the until date payload when currently active is enabled', async () => {
    getOwnProfileMock.mockResolvedValue(makeProfileResponse({
      is_currently_active: false,
      active_until_date: '2019-01-01',
    }))
    updateOwnProfileMock.mockResolvedValue(makeProfileResponse())

    render(<MyProfilePage />)

    fireEvent.click(await screen.findByLabelText('Aktuell aktiv'))
    fireEvent.click(screen.getByRole('button', { name: 'Profil speichern' }))

    await waitFor(() => {
      expect(updateOwnProfileMock).toHaveBeenCalledWith(expect.objectContaining({
        active_until_date: null,
        is_currently_active: true,
      }))
    })
    expect(screen.getByLabelText('Aktiv bis')).toHaveProperty('disabled', true)
  })

  it('sends TipTap JSON for the profile story and returns to read mode after saving', async () => {
    getOwnProfileMock.mockResolvedValue(makeProfileResponse())
    updateOwnProfileMock.mockResolvedValue(makeProfileResponse({
      member_story: 'Titel Rot Zelle',
      member_story_json: {
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Titel' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'Rot', marks: [{ type: 'textStyle', attrs: { colorToken: 'red' } }] }] },
          { type: 'table', content: [{ type: 'tableRow', content: [{ type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Zelle' }] }] }] }] },
        ],
      },
      member_story_html: '<h1>Titel</h1><p><span data-color-token="red">Rot</span></p><table><tbody><tr><td><p>Zelle</p></td></tr></tbody></table>',
      member_story_text: 'Titel Rot Zelle',
    }))

    render(<MyProfilePage />)

    fireEvent.click(await screen.findByRole('button', { name: 'Bearbeiten' }))
    fireEvent.change(screen.getByLabelText('Meine Fansub-Geschichte Editor'), { target: { value: 'Rot' } })
    fireEvent.click(screen.getByRole('button', { name: 'Profil speichern' }))

    await waitFor(() => {
      expect(updateOwnProfileMock).toHaveBeenCalledWith(expect.objectContaining({
        member_story_json: expect.objectContaining({ type: 'doc' }),
      }))
    })
    const payload = updateOwnProfileMock.mock.calls[0]?.[0] as Record<string, unknown>
    expect(payload.member_story).toBeUndefined()
    expect(JSON.stringify(payload.member_story_json)).toContain('"table"')
    expect(JSON.stringify(payload.member_story_json)).toContain('"colorToken":"red"')
    expect(await screen.findByText('Profil wurde gespeichert.')).not.toBeNull()
    expect(screen.queryByLabelText('Meine Fansub-Geschichte Editor')).toBeNull()
    expect(screen.getByTestId('story-renderer').innerHTML).toContain('<table>')
  })

  it('preserves dirty Team4s fields during Keycloak return refresh', async () => {
    getOwnProfileMock
      .mockResolvedValueOnce(makeProfileResponse())
      .mockResolvedValueOnce(makeProfileResponse({
        account_display_name: 'Mika Keycloak',
        display_name: 'Mika From Server',
        fansub_name: 'ServerNick',
      }))
    refreshActiveAuthSessionMock.mockResolvedValue(undefined)

    render(<MyProfilePage />)

    const fansubNickInput = await screen.findByLabelText('Fansub-Nick')
    fireEvent.change(fansubNickInput, { target: { value: 'Ungespeicherter Nick' } })
    fireEvent.click(screen.getByRole('link', { name: 'Accountdaten verwalten' }))
    fireEvent.focus(window)

    expect((await screen.findAllByText('Mika Keycloak')).length).toBeGreaterThan(0)
    expect(screen.getByDisplayValue('Ungespeicherter Nick')).not.toBeNull()
    expect(screen.queryByDisplayValue('ServerNick')).toBeNull()
  })

  it('preserves dirty rich story changes during Keycloak return refresh', async () => {
    getOwnProfileMock
      .mockResolvedValueOnce(makeProfileResponse())
      .mockResolvedValueOnce(makeProfileResponse({
        account_display_name: 'Mika Keycloak',
        member_story: 'Server Story',
        member_story_json: {
          type: 'doc',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Server Story' }] }],
        },
        member_story_html: '<p>Server Story</p>',
      }))
    refreshActiveAuthSessionMock.mockResolvedValue(undefined)

    render(<MyProfilePage />)

    fireEvent.click(await screen.findByRole('button', { name: 'Bearbeiten' }))
    const editor = screen.getByLabelText('Meine Fansub-Geschichte Editor')
    fireEvent.change(editor, { target: { value: 'Ungespeicherte Story' } })
    fireEvent.click(screen.getByRole('link', { name: 'Accountdaten verwalten' }))
    fireEvent.focus(window)

    expect((await screen.findAllByText('Mika Keycloak')).length).toBeGreaterThan(0)
    expect((screen.getByLabelText('Meine Fansub-Geschichte Editor') as HTMLTextAreaElement).value).toContain('Ungespeicherte Story')
    expect(screen.queryByText('Server Story')).toBeNull()
  })

  it('limits activity years to the supported range', async () => {
    getOwnProfileMock.mockResolvedValue(makeProfileResponse())

    render(<MyProfilePage />)

    const currentYear = String(new Date().getFullYear())
    const activeFromPicker = await screen.findByLabelText('Aktiv seit') as HTMLButtonElement

    expect(activeFromPicker.tagName).toBe('BUTTON')
    expect(screen.queryByLabelText('Aktiv seit ein Jahr vor')).toBeNull()
    expect(screen.queryByLabelText('Aktiv seit ein Jahr zurück')).toBeNull()

    fireEvent.click(activeFromPicker)

    expect(screen.getByRole('button', { name: currentYear })).not.toBeNull()
    expect(screen.queryByRole('button', { name: '2100' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Keine Angabe' })).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: currentYear }))
    expect(activeFromPicker.textContent).toContain(currentYear)
  })

  it('keeps avatar upload separate and surfaces upload errors without losing dirty fields', async () => {
    getOwnProfileMock.mockResolvedValue(makeProfileResponse())
    uploadOwnProfileAvatarMock.mockRejectedValue(new Error('SVG ist nicht erlaubt'))

    render(<MyProfilePage />)

    const fansubNickInput = await screen.findByLabelText('Fansub-Nick')
    fireEvent.change(fansubNickInput, { target: { value: 'Ungespeicherter Nick' } })
    fireEvent.change(screen.getByLabelText('Avatar-Bild auswählen'), {
      target: { files: [new File(['source'], 'avatar.png', { type: 'image/png' })] },
    })
    fireEvent.click(await screen.findByRole('button', { name: 'Ausschnitt übernehmen' }))

    await waitFor(() => expect(uploadOwnProfileAvatarMock).toHaveBeenCalledTimes(1))
    expect(uploadOwnProfileAvatarMock.mock.calls[0][0]).toMatchObject({
      sourceFile: expect.any(File),
      croppedFile: expect.any(File),
    })
    expect(await screen.findByText('SVG ist nicht erlaubt')).not.toBeNull()
    expect(screen.getByDisplayValue('Ungespeicherter Nick')).not.toBeNull()
    expect(updateOwnProfileMock).not.toHaveBeenCalled()
  })

  it('refreshes the hero avatar from the avatar upload response', async () => {
    getOwnProfileMock.mockResolvedValue(makeProfileResponse())
    uploadOwnProfileAvatarMock.mockResolvedValue(makeProfileResponse({
      avatar: {
        id: 137,
        filename: 'original.png',
        public_url: '/media/profile/3/avatar/new/original.png',
        mime_type: 'image/png',
        size_bytes: 1234,
        width: 512,
        height: 512,
        created_at: '2026-05-28T08:00:00Z',
      },
    }))

    render(<MyProfilePage />)

    fireEvent.change(await screen.findByLabelText('Avatar-Bild auswählen'), {
      target: { files: [new File(['source'], 'avatar.png', { type: 'image/png' })] },
    })
    fireEvent.click(await screen.findByRole('button', { name: 'Ausschnitt übernehmen' }))

    await waitFor(() => expect(uploadOwnProfileAvatarMock).toHaveBeenCalledTimes(1))
    const avatarImages = await screen.findAllByAltText('MikaFX Avatar')
    expect(avatarImages.some((image) => image.getAttribute('src') === '/media/profile/3/avatar/new/original.png')).toBe(true)
    expect(await screen.findByText('Avatar wurde aktualisiert.')).not.toBeNull()
  })

  it('uploads GIF avatars directly so animation is preserved', async () => {
    getOwnProfileMock.mockResolvedValue(makeProfileResponse())
    uploadOwnProfileAvatarMock.mockResolvedValue(makeProfileResponse({
      avatar: {
        id: 138,
        filename: 'original.gif',
        public_url: '/media/profile/3/avatar/new/original.gif',
        mime_type: 'image/gif',
        size_bytes: 2048,
        width: 512,
        height: 512,
        created_at: '2026-06-02T08:00:00Z',
      },
    }))

    render(<MyProfilePage />)

    const gifFile = new File(['gif'], 'avatar.gif', { type: 'image/gif' })
    fireEvent.change(await screen.findByLabelText('Avatar-Bild auswählen'), {
      target: { files: [gifFile] },
    })

    await waitFor(() => expect(uploadOwnProfileAvatarMock).toHaveBeenCalledTimes(1))
    const payload = uploadOwnProfileAvatarMock.mock.calls[0][0] as { sourceFile: File; croppedFile: File }
    expect(payload.sourceFile).toBe(gifFile)
    expect(payload.croppedFile).toBe(gifFile)
    expect(screen.queryByRole('dialog', { name: 'Avatar zuschneiden' })).toBeNull()
    const avatarImages = await screen.findAllByAltText('MikaFX Avatar')
    expect(avatarImages.some((image) => image.getAttribute('src') === '/media/profile/3/avatar/new/original.gif')).toBe(true)
    expect(avatarImages.every((image) => image.getAttribute('data-unoptimized') === 'true')).toBe(true)
  })

  it('uploads animated WebP avatars directly so animation is preserved', async () => {
    getOwnProfileMock.mockResolvedValue(makeProfileResponse())
    uploadOwnProfileAvatarMock.mockResolvedValue(makeProfileResponse({
      avatar: {
        id: 140,
        filename: 'original.webp',
        public_url: '/media/profile/3/avatar/new/original.webp',
        mime_type: 'image/webp',
        size_bytes: 2048,
        width: 512,
        height: 512,
        created_at: '2026-06-02T08:00:00Z',
      },
    }))

    render(<MyProfilePage />)

    const animatedWebPHeader = new Uint8Array(21)
    animatedWebPHeader.set([82, 73, 70, 70], 0)
    animatedWebPHeader.set([87, 69, 66, 80], 8)
    animatedWebPHeader.set([86, 80, 56, 88], 12)
    animatedWebPHeader[20] = 0x02
    const webPFile = new File([animatedWebPHeader], 'avatar.gif.webp', { type: 'image/webp' })
    fireEvent.change(await screen.findByLabelText('Avatar-Bild auswählen'), {
      target: { files: [webPFile] },
    })

    await waitFor(() => expect(uploadOwnProfileAvatarMock).toHaveBeenCalledTimes(1))
    const payload = uploadOwnProfileAvatarMock.mock.calls[0][0] as { sourceFile: File; croppedFile: File }
    expect(payload.sourceFile).toBe(webPFile)
    expect(payload.croppedFile).toBe(webPFile)
    expect(screen.queryByRole('dialog', { name: 'Avatar zuschneiden' })).toBeNull()
    const avatarImages = await screen.findAllByAltText('MikaFX Avatar')
    expect(avatarImages.some((image) => image.getAttribute('src') === '/media/profile/3/avatar/new/original.webp')).toBe(true)
    expect(avatarImages.every((image) => image.getAttribute('data-unoptimized') === 'true')).toBe(true)
  })

  it('uploads and refreshes the profile background image', async () => {
    getOwnProfileMock.mockResolvedValue(makeProfileResponse())
    uploadOwnProfileBackgroundMock.mockResolvedValue(makeProfileResponse({
      background_image: {
        public_url: '/media/profile/3/background/new/original.jpg',
      },
    }))

    render(<MyProfilePage />)

    fireEvent.change(await screen.findByLabelText('Hintergrundbild auswählen'), {
      target: { files: [new File(['source'], 'background.png', { type: 'image/png' })] },
    })
    expect((await screen.findByTestId('cropper-output-size')).textContent).toBe('1920x384')
    fireEvent.click(await screen.findByRole('button', { name: 'Ausschnitt übernehmen' }))

    await waitFor(() => expect(uploadOwnProfileBackgroundMock).toHaveBeenCalledTimes(1))
    expect(uploadOwnProfileBackgroundMock.mock.calls[0][0]).toMatchObject({
      sourceFile: expect.any(File),
      croppedFile: expect.any(File),
    })
    const backgroundPreview = await screen.findByAltText('Aktuelles Profil-Hintergrundbild')
    expect(backgroundPreview.getAttribute('src')).toBe('/media/profile/3/background/new/original.jpg')
    expect(await screen.findByText('Hintergrundbild wurde aktualisiert.')).not.toBeNull()
  })

  it('reuses the retained background source when editing the existing crop', async () => {
    const sourceBlob = new Blob(['background-source'], { type: 'image/jpeg' })
    const fetchMock = vi.fn().mockResolvedValue(new Response(sourceBlob, {
      status: 200,
      headers: { 'Content-Type': 'image/jpeg' },
    }))
    vi.stubGlobal('fetch', fetchMock)
    getOwnProfileMock.mockResolvedValue(makeProfileResponse({
      background_image: {
        public_url: '/media/profile/3/background/current/original.jpg',
        source_original_url: '/media/profile/3/background/current/source_original.jpg',
      },
    }))
    uploadOwnProfileBackgroundMock.mockResolvedValue(makeProfileResponse())

    render(<MyProfilePage />)

    fireEvent.click(await screen.findByRole('button', { name: 'Ausschnitt bearbeiten' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/media/profile/3/background/current/source_original.jpg'))
    const cropDialog = await screen.findByRole('dialog', { name: 'Hintergrundbild zuschneiden' })
    fireEvent.click(within(cropDialog).getByRole('button', { name: /Ausschnitt/ }))

    await waitFor(() => expect(uploadOwnProfileBackgroundMock).toHaveBeenCalledTimes(1))
    const payload = uploadOwnProfileBackgroundMock.mock.calls[0][0] as { sourceFile: File; croppedFile: File }
    expect(payload.sourceFile.name).toBe('source_original.jpg')
    expect(payload.sourceFile.type).toBe('image/jpeg')
    expect(payload.croppedFile.type).toBe('image/jpeg')
  })

  it('reuses the retained avatar source when editing the existing crop', async () => {
    const sourceBlob = new Blob(['source'], { type: 'image/jpeg' })
    const fetchMock = vi.fn().mockResolvedValue(new Response(sourceBlob, {
      status: 200,
      headers: { 'Content-Type': 'image/jpeg' },
    }))
    vi.stubGlobal('fetch', fetchMock)
    getOwnProfileMock.mockResolvedValue(makeProfileResponse({
      avatar: {
        id: 137,
        filename: 'original.png',
        public_url: '/media/profile/3/avatar/current/original.png',
        source_original_url: '/media/profile/3/avatar/current/source_original.jpg',
        mime_type: 'image/png',
        size_bytes: 1234,
        width: 512,
        height: 512,
        created_at: '2026-05-28T08:00:00Z',
      },
    }))
    uploadOwnProfileAvatarMock.mockResolvedValue(makeProfileResponse())

    render(<MyProfilePage />)

    fireEvent.click(await screen.findByRole('button', { name: 'Ausschnitt bearbeiten' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Ausschnitt übernehmen' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/media/profile/3/avatar/current/source_original.jpg'))
    await waitFor(() => expect(uploadOwnProfileAvatarMock).toHaveBeenCalledTimes(1))
    const payload = uploadOwnProfileAvatarMock.mock.calls[0][0] as { sourceFile: File; croppedFile: File }
    expect(payload.sourceFile.name).toBe('source_original.jpg')
    expect(payload.sourceFile.type).toBe('image/jpeg')
    expect(payload.croppedFile.type).toBe('image/png')
  })

  it('does not offer re-cropping for existing GIF avatars', async () => {
    getOwnProfileMock.mockResolvedValue(makeProfileResponse({
      avatar: {
        id: 139,
        filename: 'original.gif',
        public_url: '/media/profile/3/avatar/current/original.gif',
        source_original_url: '/media/profile/3/avatar/current/source_original.gif',
        mime_type: 'image/gif',
        size_bytes: 2048,
        width: 512,
        height: 512,
        created_at: '2026-06-02T08:00:00Z',
      },
    }))

    render(<MyProfilePage />)

    expect((await screen.findAllByAltText('MikaFX Avatar')).length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: 'Ausschnitt bearbeiten' })).toBeNull()
  })
})
