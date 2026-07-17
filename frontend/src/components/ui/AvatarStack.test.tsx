// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { AvatarStack } from './AvatarStack'

describe('AvatarStack', () => {
  it('zeigt maximal drei Avatare und berechnet den Overflow', () => {
    render(
      <AvatarStack
        items={[
          { id: 1, label: 'Alpha', imageUrl: '/alpha.png' },
          { id: 2, label: 'Beta' },
          { id: 3, label: 'Gamma' },
          { id: 4, label: 'Delta' },
        ]}
      />,
    )

    expect(screen.getByLabelText('4 Einträge')).toBeTruthy()
    expect(screen.getByLabelText('1 weitere').textContent).toBe('+1')
    expect(screen.queryByText('Delta')).toBeNull()
  })

  it('zeigt Initialen, wenn kein Bild vorhanden ist', () => {
    render(<AvatarStack items={[{ id: 1, label: 'C Subs' }]} />)
    expect(screen.getByText('CS')).toBeTruthy()
  })

  it('macht den Overflow optional als zugänglichen Button bedienbar', () => {
    const onOverflowClick = vi.fn()
    render(
      <AvatarStack
        items={[
          { id: 1, label: 'Alpha' },
          { id: 2, label: 'Beta' },
          { id: 3, label: 'Gamma' },
          { id: 4, label: 'Delta' },
        ]}
        maxVisible={3}
        ariaLabel="4 Coop-Partner"
        onOverflowClick={onOverflowClick}
        overflowExpanded={false}
        overflowControls="partnerliste"
      />,
    )

    const overflowButton = screen.getByRole('button', { name: '1 weitere anzeigen' })
    expect(overflowButton.getAttribute('aria-controls')).toBe('partnerliste')
    fireEvent.click(overflowButton)
    expect(onOverflowClick).toHaveBeenCalledOnce()
  })
})
