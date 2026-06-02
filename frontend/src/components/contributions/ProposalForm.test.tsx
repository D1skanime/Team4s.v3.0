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

  it('enthält den Anime-Typeahead-Input mit korrektem Placeholder', () => {
    const markup = renderToStaticMarkup(
      <ProposalForm
        onSuccess={vi.fn()}
        onClose={vi.fn()}
        ownGroups={OWN_GROUPS}
        roleDefinitions={ROLE_DEFINITIONS}
      />,
    )
    expect(markup).toContain('Anime suchen oder auswählen')
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
