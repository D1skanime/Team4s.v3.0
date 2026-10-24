// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { MeAnimeContribution, MembershipEntry } from '@/types/contributions'
import type { FansubGroupHint } from '@/types/fansub-group-hints'

import { MyProposalsSection } from './MyProposalsSection'

function makeHint(overrides: Partial<FansubGroupHint> = {}): FansubGroupHint {
  return {
    id: 1,
    sender_app_user_id: 9,
    sender_display_name: 'Timer',
    sender_own_group_name: 'NewSubs',
    target_fansub_group_id: 24,
    target_fansub_group_name: 'RedHeartFansub',
    related_anime_id: 42,
    related_anime_title: 'Beispiel-Anime',
    related_release_version_id: null,
    related_release_label: null,
    note: null,
    status: 'open',
    decided_by: null,
    decided_at: null,
    decision_note: null,
    created_at: '2026-10-23T00:00:00Z',
    ...overrides,
  }
}

const roleCatalogMocks = vi.hoisted(() => ({
  useRoleCatalog: vi.fn(),
}))

vi.mock('@/providers/RoleCatalogProvider', () => ({
  useRoleCatalog: roleCatalogMocks.useRoleCatalog,
}))

// ProposalForm selbst ist bereits durch ProposalForm.test.tsx/.useSubmit.test.ts/
// .steps.test.tsx/.extraSteps.test.tsx/.toggles.test.tsx abgedeckt -- hier interessiert
// die Trigger-Button-Gating-Regression (A6) UND (D-17, Plan 191-20) die an ProposalForm
// uebergebenen onSuccess/onClose-Callbacks, deshalb faengt der Mock die Props ab statt
// sie zu verschlucken.
const proposalFormMock = vi.hoisted(() => vi.fn())

vi.mock('./ProposalForm', () => ({
  ProposalForm: (props: unknown) => {
    proposalFormMock(props)
    return <div data-testid="proposal-form-stub" />
  },
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function renderSection(
  ownGroups: MembershipEntry[],
  proposals: MeAnimeContribution[] = [],
  onReload: () => void = vi.fn(),
  sentGroupHints: FansubGroupHint[] = [],
) {
  roleCatalogMocks.useRoleCatalog.mockImplementation(() => ({
    roles: [{ code: 'translator', label_de: 'Übersetzung', assignable: true }],
    error: null,
  }))

  return render(
    <MyProposalsSection
      proposals={proposals}
      ownGroups={ownGroups}
      onReload={onReload}
      sentGroupHints={sentGroupHints}
    />,
  )
}

describe('MyProposalsSection — A6-Regression (191-UI-SPEC.md Contract A6)', () => {
  it('ist der "Hinweis senden"-Button auch bei ownGroups=[] aktiviert (nicht mehr an ownGroups.length>0 gebunden)', () => {
    renderSection([])

    const button = screen.getByRole('button', { name: 'Hinweis senden' }) as HTMLButtonElement
    expect(button.disabled).toBe(false)
  })

  it('zeigt keinen "Verifizierte Gruppenmitgliedschaft erforderlich"-Warnhinweis mehr', () => {
    renderSection([])

    expect(screen.queryByText('Verifizierte Gruppenmitgliedschaft erforderlich.')).toBeNull()
  })

  it('bleibt bei vorhandenen eigenen Gruppen unveraendert aktiviert', () => {
    renderSection([{ fansub_group_member_id: 1, fansub_group_id: 10, group_name: 'Testgruppe' }])

    const button = screen.getByRole('button', { name: 'Hinweis senden' }) as HTMLButtonElement
    expect(button.disabled).toBe(false)
  })
})

// D-17 (Plan 191-20): ProposalForm zeigt die Erfolgsansicht selbst ueber internen
// submittedSummary-State -- vorher loeste handleFormSuccess hier onReload() aus, was auf der
// Seite einen isLoading-Zustand setzt, der MyProposalsSection (inkl. offenem Formular)
// durch einen Lade-Screen ersetzt, bevor der Nutzer die Erfolgsansicht je sieht. Reload darf
// deshalb nur noch an einen aktiven "Fertig"-Klick (onClose) gekoppelt sein.
describe('MyProposalsSection — Erfolgsansicht bleibt sichtbar (D-17)', () => {
  it('onSuccess ist ein No-op -- onReload wird NICHT aufgerufen', () => {
    const onReload = vi.fn()
    renderSection([], [], onReload)
    fireEvent.click(screen.getByRole('button', { name: 'Hinweis senden' }))

    const lastCallProps = proposalFormMock.mock.calls[proposalFormMock.mock.calls.length - 1][0] as {
      onSuccess: () => void
      onClose: () => void
    }
    act(() => lastCallProps.onSuccess())

    expect(onReload).not.toHaveBeenCalled()
    expect(screen.getByTestId('proposal-form-stub')).toBeTruthy()
  })

  it('onClose schliesst das Formular UND ruft onReload genau einmal auf', () => {
    const onReload = vi.fn()
    renderSection([], [], onReload)
    fireEvent.click(screen.getByRole('button', { name: 'Hinweis senden' }))

    const lastCallProps = proposalFormMock.mock.calls[proposalFormMock.mock.calls.length - 1][0] as {
      onSuccess: () => void
      onClose: () => void
    }
    act(() => lastCallProps.onClose())

    expect(onReload).toHaveBeenCalledTimes(1)
    expect(screen.queryByTestId('proposal-form-stub')).toBeNull()
  })
})

// 191-23/D-18: ein an eine fremde (oder eigene) Gruppe gesendeter fansub_group_hints-Hinweis
// ist fuer den Absender heute nirgends sichtbar -- diese Section zeigt ihn jetzt zusaetzlich
// zur bestehenden anime_contributions-Liste, mit derselben Status-Darstellung wie die
// Plattform-Admin-Liste (src/lib/fansubGroupHintStatus.ts).
describe('MyProposalsSection — gesendete Fremd-Gruppen-Hinweise (D-18)', () => {
  it('die Kopfzeile "Eingereichte Hinweise (n)" summiert proposals UND sentGroupHints', () => {
    renderSection(
      [],
      [
        {
          id: 1,
          anime_id: 1,
          anime_title: 'Anime A',
          fansub_group_id: 1,
          fansub_group_name: 'Gruppe A',
          status: 'proposed',
          role_codes: ['translator'],
          is_own_proposal: true,
        } as unknown as MeAnimeContribution,
      ],
      vi.fn(),
      [makeHint(), makeHint({ id: 2 })],
    )

    expect(screen.getByText('Eingereichte Hinweise (3)')).toBeTruthy()
  })

  it('rendert Zielgruppe, Projekt und Status-Badge fuer jeden gesendeten Hinweis', () => {
    renderSection([], [], vi.fn(), [
      makeHint({ target_fansub_group_name: 'RedHeartFansub', related_anime_title: 'Beispiel-Anime', status: 'open' }),
    ])

    expect(screen.getByText('RedHeartFansub')).toBeTruthy()
    expect(screen.getByText('Beispiel-Anime')).toBeTruthy()
    expect(screen.getByText('Offen')).toBeTruthy()
  })

  it('zeigt den Ablehnungsgrund nur bei status=rejected UND gesetztem decision_note', () => {
    renderSection([], [], vi.fn(), [
      makeHint({ status: 'rejected', decision_note: 'Rolle bereits besetzt.' }),
    ])

    expect(screen.getByText('Rolle bereits besetzt.')).toBeTruthy()
  })

  it('zeigt KEINEN Ablehnungsgrund bei status=rejected ohne decision_note', () => {
    renderSection([], [], vi.fn(), [makeHint({ status: 'rejected', decision_note: null })])

    expect(screen.queryByText(/Ablehngrund/)).toBeNull()
  })

  it('unterdrueckt den Leerzustand, wenn ausschliesslich sentGroupHints nicht-leer ist', () => {
    renderSection([], [], vi.fn(), [makeHint()])

    expect(screen.queryByText('Noch keine Hinweise')).toBeNull()
  })

  it('zeigt den Leerzustand weiterhin, wenn BEIDE Quellen leer sind', () => {
    renderSection([], [], vi.fn(), [])

    expect(screen.getByText('Noch keine Hinweise')).toBeTruthy()
  })

  it('der Leerzustand-Text impliziert nicht mehr, dass eine Mitgliedschaft erforderlich ist', () => {
    renderSection([], [], vi.fn(), [])

    expect(screen.queryByText(/in der du Mitglied bist/)).toBeNull()
  })
})
