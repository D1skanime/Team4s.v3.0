// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import type { ProjectMemberSummary } from '@/types/projectMember'

import { ProjectMemberSummaryBand } from './ProjectMemberSummaryBand'

afterEach(() => {
  cleanup()
})

function summary(overrides: Partial<ProjectMemberSummary> = {}): ProjectMemberSummary {
  return {
    member_id: 1,
    member_slug: 'type',
    member_display_name: 'Type',
    member_avatar_url: null,
    is_verified: false,
    role_labels: ['Typesetting'],
    counts: { roles: 1, notes: 12, media: 2, releases: 0, episodes: 13 },
    ...overrides,
  }
}

describe('ProjectMemberSummaryBand', () => {
  it('renders the single-role sentence with the episode clause', () => {
    render(<ProjectMemberSummaryBand summary={summary()} />)
    expect(
      screen.getByText('Typesetting für 13 Folgen · 12 dokumentierte Arbeitsnotizen · 2 Medien'),
    ).not.toBeNull()
  })

  it('comma-joins multiple role labels without "und"', () => {
    render(
      <ProjectMemberSummaryBand
        summary={summary({ role_labels: ['Typesetting', 'Timing'] })}
      />,
    )
    expect(
      screen.getByText(
        'Typesetting, Timing für 13 Folgen · 12 dokumentierte Arbeitsnotizen · 2 Medien',
      ),
    ).not.toBeNull()
  })

  it('omits the Folgen clause entirely when episodes is 0', () => {
    render(
      <ProjectMemberSummaryBand
        summary={summary({ counts: { roles: 1, notes: 12, media: 2, releases: 0, episodes: 0 } })}
      />,
    )
    expect(
      screen.getByText('Typesetting · 12 dokumentierte Arbeitsnotizen · 2 Medien'),
    ).not.toBeNull()
    expect(screen.queryByText(/0 Folgen/)).toBeNull()
  })
})
