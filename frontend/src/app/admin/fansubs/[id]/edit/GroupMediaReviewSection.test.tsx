// @vitest-environment jsdom
// Wave-0 RED-Test: GroupMediaReviewSection existiert noch nicht — Compile-Fehler erwartet.
// Diese Tests laufen RED, bis 78-03 die Komponente implementiert.
// listFansubGroupMedia und patchFansubMediaReview werden in 78-03 in api.ts geliefert —
// hier werden sie als benannte vi.fn()-Exports gemockt (definierte Datenquelle SC3).

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

// --- Mock-Definitionen ---
// listFansubGroupMedia = LESE-QUELLE (78-03, GET /admin/fansubs/:id/media)
// patchFansubMediaReview = MUTATION (78-03, PATCH /admin/fansubs/:id/media/:mediaId)

const listFansubGroupMedia = vi.fn()
const patchFansubMediaReview = vi.fn()

vi.mock('@/lib/api', () => ({
  listFansubGroupMedia: (...args: unknown[]) => listFansubGroupMedia(...args),
  patchFansubMediaReview: (...args: unknown[]) => patchFansubMediaReview(...args),
  ApiError: class ApiError extends Error {
    status: number
    code: string | null

    constructor(
      status: number,
      message: string,
      retryAfterSeconds: number | null = null,
      code: string | null = null,
    ) {
      super(message)
      this.status = status
      this.code = code
    }
  },
}))

// Import NACH vi.mock — Compile-Fehler hier ist das erwartete RED-Signal
import { GroupMediaReviewSection } from './GroupMediaReviewSection'
import type { FansubGroupCapabilities } from '@/types/fansub'

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

const noEditGroupCapabilities: FansubGroupCapabilities = {
  ...fullCapabilities,
  can_edit_group: false,
  can_view_group_media: false,
  can_upload_group_media: false,
  can_update_group_media: false,
  can_delete_group_media: false,
}

// Kanonischer Enum-Satz (78-CONTEXT.md "Offene Fragen RESOLVED"):
// visibility: intern | oeffentlich
// review_status: in_pruefung | freigegeben | abgelehnt | archiviert | entfernt

const sampleMediaItems = [
  {
    id: 101,
    visibility: 'intern',
    review_status: 'in_pruefung',
    owner_type: 'fansub_group',
    owner_id: 88,
    owner_consistent: true,
  },
  {
    id: 102,
    visibility: 'oeffentlich',
    review_status: 'freigegeben',
    owner_type: 'fansub_group',
    owner_id: 88,
    owner_consistent: false, // Owner-Inkonsistenz-Flag testen
  },
]

// --- D-08: Capability-Gating ---

describe('GroupMediaReviewSection — Capability-Gating (D-08)', () => {
  it('rendert nichts (null), wenn can_edit_group und Gruppenmedien-Rechte fehlen', async () => {
    listFansubGroupMedia.mockResolvedValue([])

    const { container } = render(
      <GroupMediaReviewSection fansubId={88} capabilities={noEditGroupCapabilities} />,
    )

    // Kein Inhalt sichtbar — null-Render
    expect(container.firstChild).toBeNull()
  })

  it('rendert die Sektion, wenn can_edit_group vorhanden ist', async () => {
    listFansubGroupMedia.mockResolvedValue(sampleMediaItems)

    render(<GroupMediaReviewSection fansubId={88} capabilities={fullCapabilities} />)

    // Sektions-Titel aus Copywriting-Contract
    expect(await screen.findByText('Medien prüfen')).toBeTruthy()
  })
})

// --- D-05/SC3: Sichtbarkeit- und Prüfstatus-Selektoren pro Medium ---

describe('GroupMediaReviewSection — D-05/SC3: Selektoren-Sichtbarkeit', () => {
  it('rendert Sichtbarkeit-Label und Prüfstatus-Label pro Medieneintrag', async () => {
    listFansubGroupMedia.mockResolvedValue(sampleMediaItems)

    render(<GroupMediaReviewSection fansubId={88} capabilities={fullCapabilities} />)

    // Beide Elemente aus Copywriting-Contract für mindestens einen Eintrag
    const sichtbarkeitLabels = await screen.findAllByText('Sichtbarkeit')
    const pruefstatusLabels = await screen.findAllByText('Prüfstatus')

    // Mindestens so viele Labels wie Medieneinträge
    expect(sichtbarkeitLabels.length).toBeGreaterThanOrEqual(sampleMediaItems.length)
    expect(pruefstatusLabels.length).toBeGreaterThanOrEqual(sampleMediaItems.length)
  })

  it('lädt Medien über listFansubGroupMedia (LESE-QUELLE aus 78-03)', async () => {
    listFansubGroupMedia.mockResolvedValue(sampleMediaItems)

    render(<GroupMediaReviewSection fansubId={88} capabilities={fullCapabilities} />)

    await waitFor(() => {
      expect(listFansubGroupMedia).toHaveBeenCalledWith(88, undefined)
    })
    // patchFansubMediaReview darf beim initialen Laden NICHT aufgerufen werden
    expect(patchFansubMediaReview).not.toHaveBeenCalled()
  })
})

// --- SC3: „Änderungen speichern" ruft patchFansubMediaReview ---

describe('GroupMediaReviewSection — SC3: Speichern-Mutation', () => {
  it('ruft patchFansubMediaReview(fansubId, mediaId, { visibility, review_status }) beim Speichern', async () => {
    listFansubGroupMedia.mockResolvedValue([sampleMediaItems[0]])
    patchFansubMediaReview.mockResolvedValue({ ...sampleMediaItems[0] })

    render(<GroupMediaReviewSection fansubId={88} capabilities={fullCapabilities} />)

    // Speichern-Button aus Copywriting-Contract
    fireEvent.click(await screen.findByRole('button', { name: /Änderungen speichern/ }))

    await waitFor(() => {
      expect(patchFansubMediaReview).toHaveBeenCalledWith(
        88,
        101,
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

describe('GroupMediaReviewSection — D-05: Owner-Zuordnung prüfen', () => {
  it('zeigt Badge „Owner-Zuordnung prüfen" bei owner_consistent=false', async () => {
    // Medium mit owner_consistent=false
    listFansubGroupMedia.mockResolvedValue([sampleMediaItems[1]])

    render(<GroupMediaReviewSection fansubId={88} capabilities={fullCapabilities} />)

    // Badge-Text aus Copywriting-Contract (korrekte Umlaute)
    expect(await screen.findByText('Owner-Zuordnung prüfen')).toBeTruthy()
  })

  it('zeigt kein Owner-Edit-Feld — nur Sichtbarkeit/Prüfstatus-Selektoren (kein Umhängen, D-05)', async () => {
    listFansubGroupMedia.mockResolvedValue([sampleMediaItems[1]])

    render(<GroupMediaReviewSection fansubId={88} capabilities={fullCapabilities} />)

    await screen.findByText('Owner-Zuordnung prüfen')

    // Kein Owner-Bearbeitungs-Feld (kein Input mit "Owner" im Label)
    expect(screen.queryByLabelText(/owner/i)).toBeNull()
    expect(screen.queryByPlaceholderText(/owner/i)).toBeNull()
  })

  it('zeigt kein Owner-Korrektheit-Badge bei owner_consistent=true', async () => {
    // Medium mit owner_consistent=true
    listFansubGroupMedia.mockResolvedValue([sampleMediaItems[0]])

    render(<GroupMediaReviewSection fansubId={88} capabilities={fullCapabilities} />)

    // Warten bis Daten geladen
    await screen.findByText('Sichtbarkeit')

    expect(screen.queryByText('Owner-Zuordnung prüfen')).toBeNull()
  })
})

// --- Sektions-Titel und Beschreibung (Copywriting-Contract) ---

describe('GroupMediaReviewSection — Copywriting-Contract', () => {
  it('zeigt korrekten Sektions-Titel aus UI-SPEC', async () => {
    listFansubGroupMedia.mockResolvedValue(sampleMediaItems)

    render(<GroupMediaReviewSection fansubId={88} capabilities={fullCapabilities} />)

    expect(await screen.findByText('Medien prüfen')).toBeTruthy()
  })
})
