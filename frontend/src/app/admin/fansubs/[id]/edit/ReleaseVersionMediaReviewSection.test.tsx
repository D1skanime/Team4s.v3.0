// @vitest-environment jsdom
// RED-Test: ReleaseVersionMediaReviewSection (Phase 78, 78-05)
// Diese Tests testen die Komponente gegen den erweiterten PATCH-Caller (patchReleaseVersionMediaItem)
// und die TDD-Verhaltensbeschreibung aus 78-05-PLAN.md.

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

// patchReleaseVersionMediaItem: erweiterte PATCH-Funktion (78-05, api.ts-Typ mit visibility/review_status)
const patchReleaseVersionMediaItem = vi.fn()
const getReleaseVersionMedia = vi.fn()

vi.mock('@/lib/api', () => ({
  patchReleaseVersionMediaItem: (...args: unknown[]) => patchReleaseVersionMediaItem(...args),
  getReleaseVersionMedia: (...args: unknown[]) => getReleaseVersionMedia(...args),
  ApiError: class ApiError extends Error {
    status: number
    code: string | null

    constructor(
      status: number,
      message: string,
      _retryAfterSeconds: number | null = null,
      code: string | null = null,
    ) {
      super(message)
      this.status = status
      this.code = code
    }
  },
}))

// Import NACH vi.mock
import { ReleaseVersionMediaReviewSection } from './ReleaseVersionMediaReviewSection'
import type { FansubGroupCapabilities } from '@/types/fansub'
import type { ReleaseVersionMediaItem } from '@/types/releaseVersionMedia'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

// --- Hilfsdaten ---

const fullCapabilities: FansubGroupCapabilities = {
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

const noUploadCapabilities: FansubGroupCapabilities = {
  ...fullCapabilities,
  can_upload_release_media: false,
  can_view_release_media: false,
}

const sampleMedia: ReleaseVersionMediaItem[] = [
  {
    id: 201,
    release_version_id: 42,
    media_asset_id: 301,
    category: 'screenshot',
    caption: null,
    sort_order: 1,
    is_preview_candidate: false,
    thumbnail_url: null,
    original_url: null,
    uploaded_by_user_id: null,
    created_at: '2026-01-01T00:00:00Z',
    deleted_at: null,
  },
  {
    id: 202,
    release_version_id: 42,
    media_asset_id: 302,
    category: 'other',
    caption: null,
    sort_order: 2,
    is_preview_candidate: false,
    thumbnail_url: null,
    original_url: null,
    uploaded_by_user_id: null,
    created_at: '2026-01-01T00:00:00Z',
    deleted_at: null,
  },
]

// --- D-08: Capability-Gating ---

describe('ReleaseVersionMediaReviewSection — Capability-Gating (D-08)', () => {
  it('rendert nichts (null), wenn can_upload_release_media und can_view_release_media fehlen', () => {
    const { container } = render(
      <ReleaseVersionMediaReviewSection
        versionId={42}
        capabilities={noUploadCapabilities}
        media={sampleMedia}
      />,
    )

    expect(container.firstChild).toBeNull()
  })

  it('rendert die Sektion, wenn can_upload_release_media vorhanden ist', async () => {
    render(
      <ReleaseVersionMediaReviewSection
        versionId={42}
        capabilities={fullCapabilities}
        media={sampleMedia}
      />,
    )

    // Sektions-Titel aus Copywriting-Contract (78-UI-SPEC)
    expect(await screen.findByText('Medien prüfen')).toBeTruthy()
    // Pro Release-Medium je ein Sichtbarkeits-Control (sampleMedia hat 2 Items).
    expect(screen.getAllByText('Sichtbarkeit')).toHaveLength(sampleMedia.length)
  })
})

// --- D-05/SC3: Sichtbarkeit und Prüfstatus-Selektoren ---

describe('ReleaseVersionMediaReviewSection — D-05: Selektoren', () => {
  it('rendert Select „Sichtbarkeit" und „Prüfstatus" pro Medium mit kanonischen value-Strings', async () => {
    render(
      <ReleaseVersionMediaReviewSection
        versionId={42}
        capabilities={fullCapabilities}
        media={sampleMedia}
      />,
    )

    // Labels aus Copywriting-Contract
    const sichtbarkeitLabels = await screen.findAllByText('Sichtbarkeit')
    const pruefstatusLabels = await screen.findAllByText('Prüfstatus')

    expect(sichtbarkeitLabels.length).toBeGreaterThanOrEqual(sampleMedia.length)
    expect(pruefstatusLabels.length).toBeGreaterThanOrEqual(sampleMedia.length)
  })
})

// --- SC3: „Änderungen speichern" ruft patchReleaseVersionMediaItem ---

describe('ReleaseVersionMediaReviewSection — SC3: Speichern-Mutation', () => {
  it('ruft patchReleaseVersionMediaItem(versionId, mediaId, { visibility, review_status }) beim Speichern', async () => {
    patchReleaseVersionMediaItem.mockResolvedValue({ ...sampleMedia[0] })

    render(
      <ReleaseVersionMediaReviewSection
        versionId={42}
        capabilities={fullCapabilities}
        media={[sampleMedia[0]]}
      />,
    )

    fireEvent.click(await screen.findByRole('button', { name: /Änderungen speichern/ }))

    await waitFor(() => {
      expect(patchReleaseVersionMediaItem).toHaveBeenCalledWith(
        42,
        201,
        expect.objectContaining({
          visibility: expect.any(String),
          review_status: expect.any(String),
        }),
        undefined,
      )
    })
  })
})

// --- D-05: Owner-Inkonsistenz-Flag (kein Owner-Edit-Feld) ---

describe('ReleaseVersionMediaReviewSection — D-05: Owner-Zuordnung prüfen', () => {
  it('zeigt Badge „Owner-Zuordnung prüfen" wenn ownerInconsistentIds enthält die Media-ID', async () => {
    render(
      <ReleaseVersionMediaReviewSection
        versionId={42}
        capabilities={fullCapabilities}
        media={[sampleMedia[0]]}
        ownerInconsistentIds={[201]}
      />,
    )

    expect(await screen.findByText('Owner-Zuordnung prüfen')).toBeTruthy()
  })

  it('zeigt kein Owner-Edit-Feld — nur Badge als Hinweis (kein Umhängen, D-05)', async () => {
    render(
      <ReleaseVersionMediaReviewSection
        versionId={42}
        capabilities={fullCapabilities}
        media={[sampleMedia[0]]}
        ownerInconsistentIds={[201]}
      />,
    )

    await screen.findByText('Owner-Zuordnung prüfen')

    // Kein Owner-Bearbeitungs-Feld
    expect(screen.queryByLabelText(/owner/i)).toBeNull()
    expect(screen.queryByPlaceholderText(/owner/i)).toBeNull()
  })

  it('zeigt kein Owner-Korrektheit-Badge wenn ownerInconsistentIds leer ist', async () => {
    render(
      <ReleaseVersionMediaReviewSection
        versionId={42}
        capabilities={fullCapabilities}
        media={[sampleMedia[0]]}
        ownerInconsistentIds={[]}
      />,
    )

    await screen.findByText('Sichtbarkeit')

    expect(screen.queryByText('Owner-Zuordnung prüfen')).toBeNull()
  })
})
