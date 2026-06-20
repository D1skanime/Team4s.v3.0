import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import type { MembershipEntry } from '@/types/contributions'

import { ProposalForm } from './ProposalForm'

const ROLE_DEFINITIONS = [
  { code: 'translator', label_de: 'Übersetzung' },
  { code: 'editor', label_de: 'Editing' },
  { code: 'timer', label_de: 'Timing' },
]

const OWN_GROUPS: MembershipEntry[] = [
  { fansub_group_member_id: 1, fansub_group_id: 10, group_name: 'Testgruppe' },
]

function renderForm(ownGroups = OWN_GROUPS) {
  return renderToStaticMarkup(
    <ProposalForm
      onSuccess={vi.fn()}
      onClose={vi.fn()}
      ownGroups={ownGroups}
      roleDefinitions={ROLE_DEFINITIONS}
    />,
  )
}

describe('ProposalForm', () => {
  it('zeigt den 90-Tage-Hinweis ohne Interaktion', () => {
    expect(renderForm()).toContain('90 Tagen')
  })

  it('enthält die gruppengebundene Anime-Auswahl mit Kontext', () => {
    const markup = renderForm()

    expect(markup).toContain('Bei welchem Anime/Projekt dieser Gruppe?')
    expect(markup).toContain('Erst Gruppe auswählen')
    expect(markup).toContain('Hinweis geht zur Prüfung an die zuständige Gruppe')
    expect(markup).toContain('Worum geht es?')
    expect(markup).toContain('Projekt insgesamt')
    expect(markup).toContain('Bestimmte Folgen / Release-Version')
    expect(markup).toContain('Noch nicht verfügbar')
    expect(markup).toContain('Hinweis senden')
    expect(markup).toContain('nicht als öffentlicher Profiltext angezeigt')
  })

  it('zeigt Rollenoptionen aus den roleDefinitions', () => {
    const markup = renderForm()

    expect(markup).toContain('Übersetzung')
    expect(markup).toContain('Editing')
  })

  it('nutzt YearPicker statt raw number inputs für Jahresfelder', () => {
    const markup = renderForm()

    expect(markup).toContain('aria-label="Von Jahr auswählen"')
    expect(markup).toContain('aria-label="Bis Jahr auswählen"')
    expect(markup).not.toContain('type="number"')
  })

  it('zeigt einen sichtbaren Blocked-State ohne verifizierte Gruppe', () => {
    const markup = renderForm([])

    expect(markup).toContain('verifizierte Mitgliedschaft')
    expect(markup).toContain('Keine verifizierte Gruppe verfügbar')
  })
})
