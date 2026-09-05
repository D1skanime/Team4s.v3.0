// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { NEUTRAL_ROLE_COLOR_KEY, ROLE_COLOR_KEYS } from '@/lib/roleCatalog'

import { PublicNoteCard } from './PublicNoteCard'

afterEach(cleanup)

describe('PublicNoteCard', () => {
  it('role variant: renders role, date, context line, body and footer link', () => {
    render(
      <PublicNoteCard
        roleLabel="Qualitätsprüfung"
        roleCode="quality_checker"
        dateLabel="12.04.2024"
        contextLine="Notiz zu Folge 08"
        bodyText="kurzer Text"
        footer={{ href: '/p/releases/41', label: 'Folge 08 · v1 →' }}
      />,
    )
    const card = screen.getByRole('article')
    expect(card.getAttribute('data-role-code')).toBe('quality_checker')
    expect(screen.getByText('Qualitätsprüfung')).not.toBeNull()
    expect(screen.getByText('12.04.2024')).not.toBeNull()
    expect(screen.getByText('Notiz zu Folge 08')).not.toBeNull()
    expect(screen.getByText('kurzer Text')).not.toBeNull()
    expect(screen.getByRole('link').getAttribute('href')).toBe('/p/releases/41')
  })

  it('author variant: shows author name, avatar fallback initial and combined meta line', () => {
    render(
      <PublicNoteCard
        roleLabel="Timing"
        roleCode="timer"
        author={{ name: 'Sheppert', avatarUrl: null }}
        metaSuffix="C-Subs"
        dateLabel="6. Juli 2026"
        bodyHtml="<p>Hallo</p>"
      />,
    )
    const card = screen.getByRole('article')
    expect(within(card).getByText('Sheppert')).not.toBeNull()
    expect(within(card).getByText('S')).not.toBeNull() // Avatar-Fallback-Initiale
    expect(within(card).getByText('Timing · C-Subs · 6. Juli 2026')).not.toBeNull()
    expect(card.getAttribute('data-role-code')).toBe('timer')
  })

  it('shows a toggle with custom labels + aria-controls only for long bodies', () => {
    render(
      <PublicNoteCard
        roleLabel="Editing"
        roleCode="editor"
        dateLabel="x"
        bodyText={'a'.repeat(400)}
        bodyId="release-note-body-7"
        clampThreshold={320}
        moreLabel="Weiterlesen"
        lessLabel="Weniger anzeigen"
      />,
    )
    const toggle = screen.getByRole('button', { name: 'Weiterlesen' })
    expect(toggle.getAttribute('aria-controls')).toBe('release-note-body-7')
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(toggle)
    expect(screen.getByRole('button', { name: 'Weniger anzeigen' }).getAttribute('aria-expanded')).toBe('true')
  })

  it('omits the toggle for short bodies', () => {
    render(<PublicNoteCard roleLabel="Editing" roleCode="editor" dateLabel="x" bodyText="kurz" clampThreshold={180} />)
    expect(screen.queryByRole('button')).toBeNull()
  })
})

describe('data-role-code (role_code-driven, Phase 147)', () => {
  const ROLE_CODES = [
    'fansub_lead',
    'founder',
    'co_leader',
    'techadmin',
    'gfxler',
    'karaoke_fx',
    'editor',
    'typesetter',
  ] as const

  it.each(ROLE_CODES)('renders its own data-role-code for role code "%s" (never "other")', (code) => {
    render(<PublicNoteCard roleLabel="Beliebiges Label" roleCode={code} dateLabel="x" bodyText="kurz" />)
    const card = screen.getByRole('article')
    expect(card.getAttribute('data-role-code')).toBe(code)
    expect(card.getAttribute('data-role-code')).not.toBe('other')
  })

  it('keeps data-role-code stable across a roleLabel change when roleCode is held fixed', () => {
    const { rerender } = render(
      <PublicNoteCard roleLabel="Editing" roleCode="editor" dateLabel="x" bodyText="kurz" />,
    )
    const card = screen.getByRole('article')
    expect(card.getAttribute('data-role-code')).toBe('editor')

    rerender(<PublicNoteCard roleLabel="Etwas ganz anderes" roleCode="editor" dateLabel="x" bodyText="kurz" />)
    expect(card.getAttribute('data-role-code')).toBe('editor')
  })
})

describe('data-color-key (role_color_key-driven, Phase 148)', () => {
  const SAMPLE_COLOR_KEYS = [ROLE_COLOR_KEYS[0], ROLE_COLOR_KEYS[7], ROLE_COLOR_KEYS[14]] as const

  it.each(SAMPLE_COLOR_KEYS)('renders data-color-key from roleColorKey for hex "%s"', (colorKey) => {
    render(
      <PublicNoteCard roleLabel="Beliebiges Label" roleCode="editor" roleColorKey={colorKey} dateLabel="x" bodyText="kurz" />,
    )
    const card = screen.getByRole('article')
    expect(card.getAttribute('data-color-key')).toBe(colorKey)
  })

  it('falls back to "neutral" when roleColorKey is absent', () => {
    render(<PublicNoteCard roleLabel="Beliebiges Label" roleCode="editor" dateLabel="x" bodyText="kurz" />)
    const card = screen.getByRole('article')
    expect(card.getAttribute('data-color-key')).toBe(NEUTRAL_ROLE_COLOR_KEY)
  })

  it('falls back to "neutral" when roleColorKey is null', () => {
    render(
      <PublicNoteCard roleLabel="Beliebiges Label" roleCode="editor" roleColorKey={null} dateLabel="x" bodyText="kurz" />,
    )
    const card = screen.getByRole('article')
    expect(card.getAttribute('data-color-key')).toBe(NEUTRAL_ROLE_COLOR_KEY)
  })

  it('lowercases an UPPERCASE hex from the raw DTO value so it matches the globals.css [data-color-key] selector', () => {
    // role_definitions.color_key is stored uppercase in the DB (e.g. '#C26A2E'); the DTO
    // passes that raw value through unnormalized. globals.css only defines lowercase
    // [data-color-key='#c26a2e'] selectors, so an uppercased attribute silently misses them.
    render(
      <PublicNoteCard
        roleLabel="Beliebiges Label"
        roleCode="editor"
        roleColorKey={ROLE_COLOR_KEYS[8].toUpperCase()}
        dateLabel="x"
        bodyText="kurz"
      />,
    )
    const card = screen.getByRole('article')
    expect(card.getAttribute('data-color-key')).toBe(ROLE_COLOR_KEYS[8])
  })

  it('falls back to "neutral" for an unbounded roleColorKey value (e.g. the catalog\'s "other")', () => {
    render(
      <PublicNoteCard roleLabel="Beliebiges Label" roleCode="editor" roleColorKey="other" dateLabel="x" bodyText="kurz" />,
    )
    const card = screen.getByRole('article')
    expect(card.getAttribute('data-color-key')).toBe(NEUTRAL_ROLE_COLOR_KEY)
  })

  it('keeps data-color-key stable across a roleLabel change when roleColorKey is held fixed', () => {
    const { rerender } = render(
      <PublicNoteCard
        roleLabel="Editing"
        roleCode="editor"
        roleColorKey={ROLE_COLOR_KEYS[7]}
        dateLabel="x"
        bodyText="kurz"
      />,
    )
    const card = screen.getByRole('article')
    expect(card.getAttribute('data-color-key')).toBe(ROLE_COLOR_KEYS[7])

    rerender(
      <PublicNoteCard
        roleLabel="Etwas ganz anderes"
        roleCode="editor"
        roleColorKey={ROLE_COLOR_KEYS[7]}
        dateLabel="x"
        bodyText="kurz"
      />,
    )
    expect(card.getAttribute('data-color-key')).toBe(ROLE_COLOR_KEYS[7])
  })
})
