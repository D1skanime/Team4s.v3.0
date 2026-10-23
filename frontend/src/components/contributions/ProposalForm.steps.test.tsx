// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { FansubGroup } from '@/types/fansub'

import { Step1GroupProject, Step3NoteRange } from './ProposalForm.steps'

afterEach(() => {
  cleanup()
})

const OWN_GROUP_OPTIONS = [{ value: 10, label: 'Testgruppe', subtitle: 'Eigene Gruppe' }]
const FOREIGN_RESULT: FansubGroup[] = [
  { id: 99, slug: 'redheart', name: 'RedHeartFansub' } as FansubGroup,
]

function step1Props(overrides: Partial<Parameters<typeof Step1GroupProject>[0]> = {}) {
  return {
    groupScope: 'own' as const,
    onGroupScopeChange: vi.fn(),
    ownGroups: [{ fansub_group_member_id: 1, fansub_group_id: 10, group_name: 'Testgruppe' }],
    groupOptions: OWN_GROUP_OPTIONS,
    selectedGroupId: '' as number | '',
    onGroupChange: vi.fn(),
    foreignQuery: '',
    onForeignQueryChange: vi.fn(),
    foreignResults: [],
    isSearchingForeign: false,
    foreignSearchMessage: null,
    onForeignGroupPick: vi.fn(),
    activeGroupName: null,
    hasActiveGroup: false,
    animeOptions: [],
    selectedAnimeId: '' as number | '',
    selectedAnime: null,
    isLoadingGroupAnime: false,
    groupAnime: [],
    groupAnimeError: null,
    onAnimeChange: vi.fn(),
    ...overrides,
  }
}

describe('Step1GroupProject — Gruppen-Bereich-Umschalter (D-02)', () => {
  it('rendert bei groupScope="own" das ChoiceSelect ueber die eigenen Gruppen, keine Fremd-Suche', () => {
    render(<Step1GroupProject {...step1Props()} />)

    expect(screen.getByRole('button', { name: 'Welche Gruppe soll prüfen?' })).toBeTruthy()
    expect(screen.queryByRole('textbox', { name: 'Andere Gruppe suchen' })).toBeNull()
  })

  it('rendert bei groupScope="foreign" die Suche statt des ChoiceSelect und die Ergebnisliste', () => {
    render(
      <Step1GroupProject
        {...step1Props({ groupScope: 'foreign', foreignResults: FOREIGN_RESULT })}
      />,
    )

    expect(screen.queryByRole('button', { name: 'Welche Gruppe soll prüfen?' })).toBeNull()
    expect(screen.getByRole('textbox', { name: 'Andere Gruppe suchen' })).toBeTruthy()
    expect(screen.getByRole('button', { name: /RedHeartFansub/ })).toBeTruthy()
  })

  it('ruft onForeignGroupPick auf, wenn ein Suchergebnis angeklickt wird', () => {
    const onForeignGroupPick = vi.fn()
    render(
      <Step1GroupProject
        {...step1Props({ groupScope: 'foreign', foreignResults: FOREIGN_RESULT, onForeignGroupPick })}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /RedHeartFansub/ }))
    expect(onForeignGroupPick).toHaveBeenCalledWith(FOREIGN_RESULT[0])
  })

  it('zeigt den Kontext-Chip mit Badge "Eigene Gruppe" (muted) bei own, "Andere Gruppe" (info) bei foreign', () => {
    const { rerender } = render(
      <Step1GroupProject {...step1Props({ hasActiveGroup: true, activeGroupName: 'Testgruppe' })} />,
    )
    expect(screen.getByLabelText('Ausgewählter Kontext').textContent).toContain('Eigene Gruppe')

    rerender(
      <Step1GroupProject
        {...step1Props({
          groupScope: 'foreign',
          hasActiveGroup: true,
          activeGroupName: 'RedHeartFansub',
        })}
      />,
    )
    expect(screen.getByLabelText('Ausgewählter Kontext').textContent).toContain('Andere Gruppe')
  })

  it('zeigt den Anime/Projekt-Schritt immer (D-09: jeder verbleibende Hinweis ist ein Korrektur-Hinweis mit Projektbezug)', () => {
    render(<Step1GroupProject {...step1Props()} />)
    expect(screen.getByText('Bei welchem Anime/Projekt dieser Gruppe?')).toBeTruthy()
  })

  // D-13 (Live-UAT-Bugfix): der gewaehlte Gruppenname erschien bisher dreifach (Suchergebnis-
  // Zeile, eine separate "Ausgewaehlt: {name}"-Zeile, die selectionBreadcrumb-Pille). Die
  // separate Zeile entfaellt ersatzlos -- die Pille unten trägt dieselbe Information bereits.
  it('rendert nach Auswahl einer fremden Gruppe keine separate "Ausgewählt: ..."-Zeile mehr (D-13)', () => {
    render(
      <Step1GroupProject
        {...step1Props({ groupScope: 'foreign', hasActiveGroup: true, activeGroupName: 'RedHeartFansub' })}
      />,
    )
    expect(screen.queryByText(/Ausgewählt:/)).toBeNull()
    // Die Information bleibt einzig ueber die Breadcrumb-Pille erhalten.
    expect(screen.getByLabelText('Ausgewählter Kontext').textContent).toContain('RedHeartFansub')
  })
})

// D-19 (Plan 191-20): Von/Bis-Jahr sind fuer JEDEN verbleibenden Hinweis universell sichtbar
// (D-20/Plan 191-21 braucht sie auch fuer Fremdgruppen-Hinweise) -- nur der Infopanel-Satz
// darunter haengt vom groupScope ab, weil der 90-Tage-Automatismus ausschliesslich fuer den
// Eigengruppen-Weg (anime_contributions) gilt.
describe('Step3NoteRange — groupScope-abhaengiger Infopanel-Satz (D-19)', () => {
  function step3Props(overrides: Partial<Parameters<typeof Step3NoteRange>[0]> = {}) {
    return {
      note: '',
      startedYear: '',
      endedYear: '',
      hasInvalidYearRange: false,
      groupScope: 'own' as const,
      onNoteChange: vi.fn(),
      onStartedYearChange: vi.fn(),
      onEndedYearChange: vi.fn(),
      ...overrides,
    }
  }

  it('zeigt bei groupScope="own" Von/Bis-Jahr und den 90-Tage-Text, nicht den Fremdgruppen-Satz', () => {
    render(<Step3NoteRange {...step3Props({ groupScope: 'own' })} />)

    expect(screen.getByLabelText('Von Jahr auswählen')).toBeTruthy()
    expect(screen.getByLabelText('Bis Jahr auswählen')).toBeTruthy()
    expect(screen.getByText(/Keine Reaktion nach 90 Tagen/)).toBeTruthy()
    expect(screen.queryByText(/Leitung der Zielgruppe/)).toBeNull()
  })

  it('zeigt bei groupScope="foreign" weiterhin Von/Bis-Jahr (Regressionsschutz D-20) und den neuen Routing-Satz, nicht den 90-Tage-Text', () => {
    render(<Step3NoteRange {...step3Props({ groupScope: 'foreign' })} />)

    expect(screen.getByLabelText('Von Jahr auswählen')).toBeTruthy()
    expect(screen.getByLabelText('Bis Jahr auswählen')).toBeTruthy()
    expect(screen.queryByText(/Keine Reaktion nach 90 Tagen/)).toBeNull()
    expect(
      screen.getByText(
        'Der Hinweis geht an die Leitung der Zielgruppe — oder, falls diese aktuell keine Leitung hat, an den Plattform-Admin. Es passiert nichts automatisch.',
      ),
    ).toBeTruthy()
  })

  it('zeigt das Notizfeld bei beiden Scopes unveraendert', () => {
    render(<Step3NoteRange {...step3Props({ groupScope: 'foreign' })} />)
    expect(screen.getByLabelText('Hinweis für den Gruppenleader')).toBeTruthy()
  })
})
