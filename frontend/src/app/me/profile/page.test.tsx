// @vitest-environment jsdom

import type { ImgHTMLAttributes, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'

import type { MemberProfileResponse } from '@/types/profile'

const getOwnProfileMock = vi.fn()
const refreshActiveAuthSessionMock = vi.fn()
const updateOwnProfileMock = vi.fn()
const uploadOwnProfileAvatarMock = vi.fn()
const uploadOwnProfileBackgroundMock = vi.fn()
const useAuthSessionMock = vi.hoisted(() => vi.fn())

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode; [key: string]: unknown }) => <a href={href} {...props}>{children}</a>,
}))

vi.mock('next/image', () => ({
  default: ({ alt, unoptimized, ...props }: ImgHTMLAttributes<HTMLImageElement> & { unoptimized?: boolean }) => {
    void unoptimized
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={alt} {...props} />
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
    onApply,
    onCancel,
  }: {
    title: string
    onApply: (croppedFile: File) => void
    onCancel: () => void
  }) => (
    <div role="dialog" aria-label={title}>
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
  getOwnProfile: (...args: unknown[]) => getOwnProfileMock(...args),
  refreshActiveAuthSession: (...args: unknown[]) => refreshActiveAuthSessionMock(...args),
  updateOwnProfile: (...args: unknown[]) => updateOwnProfileMock(...args),
  uploadOwnProfileAvatar: (...args: unknown[]) => uploadOwnProfileAvatarMock(...args),
  uploadOwnProfileBackground: (...args: unknown[]) => uploadOwnProfileBackgroundMock(...args),
  resolveApiUrl: (value: string) => value,
}))

import MyProfilePage from './page'

beforeEach(() => {
  useAuthSessionMock.mockReturnValue({
    authToken: '',
    hasAccessToken: true,
    hasRefreshToken: true,
    displayName: 'Mika',
    isClientInitialized: true,
  })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

function makeProfileResponse(overrides: Partial<MemberProfileResponse['data']> = {}): MemberProfileResponse {
  return {
    data: {
      member_id: 4,
      app_user_id: 11,
      legacy_user_id: 8,
      display_name: 'Mika',
      fansub_name: 'MikaFX',
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

    fireEvent.change(await screen.findByLabelText('Aktiv seit'), { target: { value: '2015' } })
    fireEvent.change(screen.getByLabelText('Aktiv bis'), { target: { value: '2020' } })
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

    fireEvent.click(await screen.findByLabelText('Ich bin aktuell in der Fansub-Szene aktiv'))
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

    const activeFromSelect = await screen.findByLabelText('Aktiv seit')

    expect(activeFromSelect.tagName).toBe('SELECT')
    expect(within(activeFromSelect).getByRole('option', { name: '1970' })).not.toBeNull()
    expect(within(activeFromSelect).getByRole('option', { name: '2100' })).not.toBeNull()
    expect(within(activeFromSelect).queryByRole('option', { name: '1969' })).toBeNull()
    expect(within(activeFromSelect).queryByRole('option', { name: '2101' })).toBeNull()
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
    fireEvent.click(await screen.findByRole('button', { name: 'Ausschnitt übernehmen' }))

    await waitFor(() => expect(uploadOwnProfileBackgroundMock).toHaveBeenCalledTimes(1))
    expect(uploadOwnProfileBackgroundMock.mock.calls[0][0]).toMatchObject({
      croppedFile: expect.any(File),
    })
    const backgroundPreview = await screen.findByAltText('Aktuelles Profil-Hintergrundbild')
    expect(backgroundPreview.getAttribute('src')).toBe('/media/profile/3/background/new/original.jpg')
    expect(await screen.findByText('Hintergrundbild wurde aktualisiert.')).not.toBeNull()
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
})
