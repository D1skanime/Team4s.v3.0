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

describe('ProposalForm', () => {
  it('zeigt den 90-Tage-Hinweis ohne Interaktion', () => {
    const markup = renderToStaticMarkup(
      <ProposalForm
        onSuccess={vi.fn()}
        onClose={vi.fn()}
        ownGroups={OWN_GROUPS}
        roleDefinitions={ROLE_DEFINITIONS}
      />,
    )
    expect(markup).toContain('90 Tagen')
  })

  it('enthält die gruppengebundene Anime-Auswahl mit Kontext', () => {
    const markup = renderToStaticMarkup(
      <ProposalForm
        onSuccess={vi.fn()}
        onClose={vi.fn()}
        ownGroups={OWN_GROUPS}
        roleDefinitions={ROLE_DEFINITIONS}
      />,
    )
    expect(markup).toContain('Bei welchem Anime/Projekt dieser Gruppe?')
    expect(markup).toContain('Erst Gruppe auswählen')
    expect(markup).toContain('Du schlägst hier keine freie Anime-Notiz vor.')
    expect(markup).toContain('Was möchtest du bestätigen lassen?')
    expect(markup).toContain('Ganzer Anime / Projekt')
    expect(markup).toContain('Bestimmte Folgen / Release-Version')
    expect(markup).toContain('Zur Bestätigung senden')
    expect(markup).toContain('nicht als öffentlicher Profiltext angezeigt')
  })

  it('zeigt Rollenoptionen aus den roleDefinitions', () => {
    const markup = renderToStaticMarkup(
      <ProposalForm
        onSuccess={vi.fn()}
        onClose={vi.fn()}
        ownGroups={OWN_GROUPS}
        roleDefinitions={ROLE_DEFINITIONS}
      />,
    )
    expect(markup).toContain('Übersetzung')
    expect(markup).toContain('Editing')
  })
})
