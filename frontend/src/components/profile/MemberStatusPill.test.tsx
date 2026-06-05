// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

// MemberStatusPill existiert noch nicht — macht diesen Test legitim RED (C/D-09).
import { MemberStatusPill } from './MemberStatusPill'

// Alle 5 gültigen Status laut D-09
const ALL_STATUS = [
  { status: 'active', labelDE: 'Aktiv' },
  { status: 'historical', labelDE: 'Historisch' },
  { status: 'unclaimed', labelDE: 'Nicht beansprucht' },
  { status: 'claimed', labelDE: 'Beansprucht' },
  { status: 'memorial', labelDE: 'Gedenkprofil' },
] as const

describe('MemberStatusPill', () => {
  it.each(ALL_STATUS)(
    'rendert sichtbares Label für Status "$status" (D-09)',
    ({ status, labelDE }) => {
      render(<MemberStatusPill status={status} />)

      // Sichtbares deutsches Label muss vorhanden sein
      const pill = screen.getByText(labelDE)
      expect(pill).not.toBeNull()
    },
  )

  it.each(ALL_STATUS)(
    'hat Tooltip/title-Attribut für Status "$status" (D-09)',
    ({ status }) => {
      render(<MemberStatusPill status={status} />)

      // Jeder Status muss einen erklärenden Tooltip (title-Attribut) haben
      const element = document.querySelector('[title]')
      if (element === null) {
        throw new Error(`MemberStatusPill für Status "${status}" hat kein title/tooltip-Attribut (D-09)`)
      }
      const title = element.getAttribute('title')
      if (!title || title.trim() === '') {
        throw new Error(`MemberStatusPill für Status "${status}" hat leeres title-Attribut (D-09)`)
      }
    },
  )

  it('Memorial-Status hat besonders erklärenden Tooltip', () => {
    render(<MemberStatusPill status="memorial" />)

    // Memorial braucht aussagekräftigen Tooltip (keine leere Erklärung)
    const element = document.querySelector('[title]')
    expect(element).not.toBeNull()
    const title = element?.getAttribute('title') ?? ''
    expect(title.length).toBeGreaterThan(10)
  })
})
