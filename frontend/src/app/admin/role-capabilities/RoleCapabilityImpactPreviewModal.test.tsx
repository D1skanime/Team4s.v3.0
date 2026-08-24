// @vitest-environment jsdom
//
// Plan 138-13 (CAP-09, D-18/D-19/D-20/D-21): RoleCapabilityImpactPreviewModal never mutates a
// role-to-capability grant/revoke without a successfully computed before/after impact preview
// first, and after a confirmed mutation stays open showing the honest CAP-10 activation status
// instead of a fabricated "wird aktiviert" spinner.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type {
  CapabilityOverrideImpactItem,
  CapabilityOverrideImpactPreview,
  EffectiveRightState,
  RoleCapabilityMutationResult,
  RoleHolderEntry,
} from '@/types/admin-capability'

const mockGetRoleCapabilityImpactPreview = vi.fn()
const mockListRoleHolders = vi.fn()
const mockGrantRoleCapability = vi.fn()
const mockRevokeRoleCapability = vi.fn()

vi.mock('@/lib/api', () => ({
  getRoleCapabilityImpactPreview: (...args: unknown[]) => mockGetRoleCapabilityImpactPreview(...args),
  listRoleHolders: (...args: unknown[]) => mockListRoleHolders(...args),
  grantRoleCapability: (...args: unknown[]) => mockGrantRoleCapability(...args),
  revokeRoleCapability: (...args: unknown[]) => mockRevokeRoleCapability(...args),
  ApiError: class ApiError extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message)
    }
  },
}))

import { ApiError } from '@/lib/api'
import { RoleCapabilityImpactPreviewModal } from './RoleCapabilityImpactPreviewModal'

/**
 * matchMedia-Mock für jsdom — identisches Muster wie RoleHoldersTable.test.tsx. Default:
 * Desktop (kein Match für max-width: 759px).
 */
function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

beforeEach(() => {
  mockMatchMedia(false)
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function makeState(overrides: Partial<EffectiveRightState> = {}): EffectiveRightState {
  return {
    action_code: 'fansub_group_media.upload',
    allowed: false,
    provenance: 'no_grant',
    decisive: true,
    non_deniable: false,
    granting_roles: [],
    user_allow: false,
    user_deny: false,
    specialized_grants: [],
    decisive_source: 'no_grant',
    reason_code: 'no_grant',
    ...overrides,
  }
}

function makeHolder(overrides: Partial<RoleHolderEntry> = {}): RoleHolderEntry {
  return {
    app_user_id: 1,
    display_name: 'Sorata',
    email: 'sorata@example.com',
    fansub_group_id: 10,
    fansub_group_name: 'Anime no Sekai',
    membership_status: 'active',
    has_overrides: false,
    ...overrides,
  }
}

/**
 * Fixture-Set mit allen 4 Ergebnis-Kategorien (verlieren/gewinnen/behalten-über-Rolle/
 * behalten-über-Abweichung) plus einem unveränderten Rolleninhaber -- deckt die 5 D-19-Kopfzeilen
 * ab (1 Verlust, 1 Gewinn, 1 Rolle-behalten, 1 Abweichung-behalten, 1 unverändert = 5 Inhaber).
 */
function fiveOutcomeItems(): CapabilityOverrideImpactItem[] {
  return [
    {
      target_user_id: 2,
      before: makeState({ allowed: true }),
      after: makeState({ allowed: false }),
    },
    {
      target_user_id: 3,
      before: makeState({ allowed: false }),
      after: makeState({ allowed: true }),
    },
    {
      target_user_id: 1,
      before: makeState({ allowed: true, granting_roles: ['fansub_lead', 'webmaster'] }),
      after: makeState({ allowed: true, granting_roles: ['webmaster'], decisive_source: 'group_role' }),
    },
    {
      target_user_id: 4,
      before: makeState({ allowed: true, user_allow: true, decisive_source: 'user_allow' }),
      after: makeState({ allowed: true, user_allow: true, decisive_source: 'user_allow' }),
    },
    {
      target_user_id: 5,
      before: makeState({ allowed: false }),
      after: makeState({ allowed: false }),
    },
  ]
}

function fiveOutcomeHolders(): RoleHolderEntry[] {
  return [
    makeHolder({ app_user_id: 2, display_name: 'Mika', fansub_group_id: 10, fansub_group_name: 'Anime no Sekai' }),
    makeHolder({ app_user_id: 3, display_name: 'Kenji', fansub_group_id: 11, fansub_group_name: 'Moonlight Subs' }),
    makeHolder({ app_user_id: 1, display_name: 'Sorata', fansub_group_id: 10, fansub_group_name: 'Anime no Sekai' }),
    makeHolder({ app_user_id: 4, display_name: 'Yui', fansub_group_id: 10, fansub_group_name: 'Anime no Sekai' }),
    makeHolder({ app_user_id: 5, display_name: 'Aoi', fansub_group_id: 12, fansub_group_name: 'Sakura Fansub' }),
  ]
}

function makePreview(items: CapabilityOverrideImpactItem[]): CapabilityOverrideImpactPreview {
  return { affected_user_count: items.length, items }
}

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  roleCode: 'fansub_lead',
  roleLabel: 'Fansub-Lead',
  actionCode: 'fansub_group_media.upload',
  actionLabel: 'Gruppen-Medien hochladen',
  add: true,
  onMutated: vi.fn(),
}

describe('RoleCapabilityImpactPreviewModal', () => {
  it('zeigt LoadingState und deaktiviert Bestätigen, während die Vorschau lädt', async () => {
    let resolvePreview: (value: CapabilityOverrideImpactPreview) => void = () => {}
    mockGetRoleCapabilityImpactPreview.mockReturnValueOnce(
      new Promise((resolve) => {
        resolvePreview = resolve
      }),
    )
    mockListRoleHolders.mockResolvedValueOnce([])

    render(<RoleCapabilityImpactPreviewModal {...defaultProps} />)

    expect(screen.getByText(/Auswirkungs-Vorschau wird geladen/)).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Änderung übernehmen' })).toHaveProperty('disabled', true)

    resolvePreview(makePreview([]))
    await waitFor(() => {
      expect(screen.queryByText(/Auswirkungs-Vorschau wird geladen/)).toBeNull()
    })
  })

  it('berechnet die 5 D-19-Kopfzeilen korrekt aus einem Fixture-Set aller 4 Ergebnis-Kategorien plus unveränderten Inhabern', async () => {
    mockGetRoleCapabilityImpactPreview.mockResolvedValueOnce(makePreview(fiveOutcomeItems()))
    mockListRoleHolders.mockResolvedValueOnce(fiveOutcomeHolders())

    render(<RoleCapabilityImpactPreviewModal {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('5 Rolleninhaber')).not.toBeNull()
    })
    expect(screen.getByText('1 verlieren das Recht')).not.toBeNull()
    expect(screen.getByText('1 gewinnen das Recht')).not.toBeNull()
    expect(screen.getByText('1 behalten es über eine andere Rolle')).not.toBeNull()
    expect(screen.getByText('1 behalten es über eine persönliche Abweichung')).not.toBeNull()
  })

  it('rendert die Detailtabelle mit Benutzer/Gruppe-Namen aus den Rolleninhabern, sortiert mit "verliert das Recht" zuerst', async () => {
    mockGetRoleCapabilityImpactPreview.mockResolvedValueOnce(makePreview(fiveOutcomeItems()))
    mockListRoleHolders.mockResolvedValueOnce(fiveOutcomeHolders())

    render(<RoleCapabilityImpactPreviewModal {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Mika')).not.toBeNull()
    })
    // Spalten exakt: Benutzer | Gruppe | vorher | nachher | Grund
    expect(screen.getByText('Benutzer')).not.toBeNull()
    expect(screen.getByText('Gruppe')).not.toBeNull()
    expect(screen.getByText('vorher')).not.toBeNull()
    expect(screen.getByText('nachher')).not.toBeNull()
    expect(screen.getByText('Grund')).not.toBeNull()

    // Join-Check: Gruppen-Namen aus den Rolleninhabern erscheinen in der Tabelle (Anime no
    // Sekai kommt bei 3 der 5 Fixture-Inhaber vor, daher getAllByText statt getByText).
    expect(screen.getAllByText('Anime no Sekai').length).toBeGreaterThan(0)
    expect(screen.getByText('Moonlight Subs')).not.toBeNull()

    // Sortierung: die erste Datenzeile (nach dem Kopf) muss der Verlust-Fall (Mika) sein.
    const rows = screen.getAllByRole('row')
    // rows[0] = Kopfzeile, rows[1] = erste Datenzeile
    expect(rows[1].textContent).toContain('Mika')
    expect(rows[1].textContent).toContain('keine weitere Quelle')
  })

  it('zeigt bei Vorschau-Fehler die gesperrte Fehlermeldung und deaktiviert Bestätigen dauerhaft', async () => {
    mockGetRoleCapabilityImpactPreview.mockRejectedValueOnce(new ApiError(500, 'interner serverfehler'))
    mockListRoleHolders.mockResolvedValueOnce([])

    render(<RoleCapabilityImpactPreviewModal {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText(/Auswirkungs-Vorschau nicht verfügbar/)).not.toBeNull()
    })
    expect(screen.getByRole('button', { name: 'Änderung übernehmen' })).toHaveProperty('disabled', true)
    expect(mockGrantRoleCapability).not.toHaveBeenCalled()
    expect(mockRevokeRoleCapability).not.toHaveBeenCalled()
  })

  it('bestätigt Grant, ruft onMutated auf und rendert ActivationStatusIndicator mit dem echten cache_reload_succeeded-Wert, ohne das Modal zu schließen', async () => {
    const onClose = vi.fn()
    const onMutated = vi.fn()
    mockGetRoleCapabilityImpactPreview.mockResolvedValueOnce(makePreview([]))
    mockListRoleHolders.mockResolvedValueOnce([])
    const mutationResult: RoleCapabilityMutationResult = {
      message: 'ok',
      cache_reload_succeeded: false,
    }
    mockGrantRoleCapability.mockResolvedValueOnce(mutationResult)

    render(<RoleCapabilityImpactPreviewModal {...defaultProps} onClose={onClose} onMutated={onMutated} />)

    const confirmButton = await screen.findByRole('button', { name: 'Änderung übernehmen' })
    await waitFor(() => expect(confirmButton).toHaveProperty('disabled', false))

    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(mockGrantRoleCapability).toHaveBeenCalledWith('fansub_lead', 'fansub_group_media.upload')
    })
    expect(mockRevokeRoleCapability).not.toHaveBeenCalled()
    expect(onMutated).toHaveBeenCalledTimes(1)
    // D-21: Modal bleibt offen -- onClose wird durch die Bestätigung NICHT aufgerufen.
    expect(onClose).not.toHaveBeenCalled()
    // Ehrlicher Fehlschlag-Text (cache_reload_succeeded=false).
    expect(
      await screen.findByText(/Der Rechte-Cache konnte nicht aktualisiert werden/),
    ).not.toBeNull()
  })

  it('ruft bei add=false revokeRoleCapability statt grantRoleCapability auf', async () => {
    mockGetRoleCapabilityImpactPreview.mockResolvedValueOnce(makePreview([]))
    mockListRoleHolders.mockResolvedValueOnce([])
    mockRevokeRoleCapability.mockResolvedValueOnce({ message: 'ok', cache_reload_succeeded: true })

    render(<RoleCapabilityImpactPreviewModal {...defaultProps} add={false} />)

    const confirmButton = await screen.findByRole('button', { name: 'Änderung übernehmen' })
    await waitFor(() => expect(confirmButton).toHaveProperty('disabled', false))
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(mockRevokeRoleCapability).toHaveBeenCalledWith('fansub_lead', 'fansub_group_media.upload')
    })
    expect(mockGrantRoleCapability).not.toHaveBeenCalled()
    expect(await screen.findByText(/Gespeichert und aktiv/)).not.toBeNull()
  })

  it('rendert bei schmaler Viewport-Breite alle 5 Metriken plus vorher/nachher/Grund als Karten statt Tabelle (GAP-02)', async () => {
    mockMatchMedia(true)
    mockGetRoleCapabilityImpactPreview.mockResolvedValueOnce(makePreview(fiveOutcomeItems()))
    mockListRoleHolders.mockResolvedValueOnce(fiveOutcomeHolders())

    render(<RoleCapabilityImpactPreviewModal {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('5 Rolleninhaber')).not.toBeNull()
    })
    expect(screen.getByText('1 verlieren das Recht')).not.toBeNull()
    expect(screen.getByText('1 gewinnen das Recht')).not.toBeNull()
    expect(screen.getByText('1 behalten es über eine andere Rolle')).not.toBeNull()
    expect(screen.getByText('1 behalten es über eine persönliche Abweichung')).not.toBeNull()

    // Karten statt Tabelle -- keine horizontal scrollende Tabelle mehr unterhalb 759px.
    expect(screen.queryByRole('table')).toBeNull()

    // Mika (Verlust-Fall) muss als Karte mit vorher/nachher/Grund lesbar sein (jede der 5
    // Karten trägt eigene vorher/nachher/Grund-Labels, daher getAllByText).
    expect(screen.getByText('Mika')).not.toBeNull()
    expect(screen.getAllByText('vorher').length).toBeGreaterThan(0)
    expect(screen.getAllByText('nachher').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Grund').length).toBeGreaterThan(0)
    expect(screen.getByText('keine weitere Quelle')).not.toBeNull()
    expect(screen.getAllByText('nicht erlaubt').length).toBeGreaterThan(0)
  })

  it('trägt die narrowHeightFix-Klasse auf dem Dialog-Panel bei schmaler Viewport-Breite (GAP-02)', async () => {
    mockMatchMedia(true)
    mockGetRoleCapabilityImpactPreview.mockResolvedValueOnce(makePreview([]))
    mockListRoleHolders.mockResolvedValueOnce([])

    render(<RoleCapabilityImpactPreviewModal {...defaultProps} />)

    await waitFor(() => {
      expect(screen.queryByText(/Auswirkungs-Vorschau wird geladen/)).toBeNull()
    })

    const dialog = screen.getByRole('dialog')
    const panel = dialog.querySelector('[tabindex="-1"]')
    expect(panel?.className).toMatch(/narrowHeightFix/)
  })
})
