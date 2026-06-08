// @vitest-environment jsdom

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { MemberRoleTimeline } from './MemberRoleTimeline'
import type { PublicMemberRoleEntry } from '@/types/contributions'

function makeEntry(overrides: Partial<PublicMemberRoleEntry> = {}): PublicMemberRoleEntry {
  return {
    fansub_group_name: 'Subs e.V.',
    fansub_group_slug: 'subs-ev',
    role_code: 'translation',
    role_label: 'Übersetzung',
    context: 'anime_contribution',
    anime_title: 'Naruto',
    anime_id: 10,
    started_year: 2020,
    ended_year: null,
    status: 'confirmed',
    notes: null,
    ...overrides,
  }
}

describe('MemberRoleTimeline EntryDetail (D-07)', () => {
  it('zeigt notes im aufgeklappten Detail-Bereich an', () => {
    render(
      <MemberRoleTimeline
        entries={[makeEntry({ notes: 'Zweite Staffel mitübersetzt' })]}
        hasUnverified={false}
      />,
    )

    // Vor dem Aufklappen ist die Notiz nicht sichtbar
    expect(screen.queryByText(/Zweite Staffel mitübersetzt/)).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /details anzeigen/i }))

    expect(screen.getByText(/Zweite Staffel mitübersetzt/)).toBeTruthy()
  })

  it('blendet den Details-Button ein, wenn nur notes als Detail vorhanden ist', () => {
    render(
      <MemberRoleTimeline
        entries={[
          makeEntry({
            role_code: '',
            anime_title: null,
            anime_id: null,
            context: 'group_history',
            notes: 'Nur eine Notiz',
          }),
        ]}
        hasUnverified={false}
      />,
    )

    expect(screen.getByRole('button', { name: /details anzeigen/i })).toBeTruthy()
  })

  it('zeigt keinen Details-Button, wenn kein Detail (kein role_code, kein anime, keine notes)', () => {
    render(
      <MemberRoleTimeline
        entries={[
          makeEntry({
            role_code: '',
            anime_title: null,
            anime_id: null,
            context: 'group_history',
            notes: '   ',
          }),
        ]}
        hasUnverified={false}
      />,
    )

    expect(screen.queryByRole('button', { name: /details anzeigen/i })).toBeNull()
  })

  it('behält role_label als primäre Anzeige (keine Subtype-Promotion)', () => {
    render(
      <MemberRoleTimeline
        entries={[makeEntry({ role_label: 'Übersetzung', role_code: 'translation' })]}
        hasUnverified={false}
      />,
    )

    // role_label ist als Hauptanzeige sichtbar, role_code nicht (erst im Expand)
    expect(screen.getByText('Übersetzung')).toBeTruthy()
    expect(screen.queryByText(/Rollencode/)).toBeNull()
  })
})
