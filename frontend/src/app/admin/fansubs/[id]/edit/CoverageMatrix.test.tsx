// @vitest-environment jsdom

import { createElement, type ImgHTMLAttributes } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import { CoverageMatrix } from './CoverageMatrix'

vi.mock('next/image', () => ({
  default: ({
    alt = '',
    unoptimized,
    ...props
  }: ImgHTMLAttributes<HTMLImageElement> & { unoptimized?: boolean }) => {
    void unoptimized
    return createElement('img', { alt, ...props })
  },
}))

describe('CoverageMatrix', () => {
  it('zeigt Member-Initialen je Rolle statt nur Status-Icons', () => {
    const onCellClick = vi.fn()

    render(
      <CoverageMatrix
        roles={[
          { code: 'translator', label: 'Übersetzung', sort_order: 1 },
          { code: 'timer', label: 'Timing', sort_order: 2 },
        ]}
        rows={[
          {
            animeId: 13,
            animeTitle: 'Naruto',
            roleMembersByCode: {
              translator: [
                { memberId: 7, displayName: 'Sakura Haruno' },
                { memberId: 8, displayName: 'Kakashi' },
              ],
            },
          },
        ]}
        onCellClick={onCellClick}
      />,
    )

    expect(screen.getByText('SH')).not.toBeNull()
    expect(screen.getByText('KA')).not.toBeNull()
    expect(screen.getByText('Fehlt')).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Timing für Naruto zuweisen' }))
    expect(onCellClick).toHaveBeenCalledWith(13, 'timer')
  })

  it('rendert optional echte Avatar-URLs', () => {
    const { container } = render(
      <CoverageMatrix
        roles={[{ code: 'timer', label: 'Timing', sort_order: 1 }]}
        rows={[
          {
            animeId: 13,
            animeTitle: 'Naruto',
            roleMembersByCode: {
              timer: [
                {
                  memberId: 9,
                  displayName: 'Naruto Uzumaki',
                  avatarUrl: '/avatars/naruto.png',
                },
              ],
            },
          },
        ]}
      />,
    )

    const avatar = container.querySelector('img')
    expect(avatar?.getAttribute('src')).toBe('/avatars/naruto.png')
  })
})
