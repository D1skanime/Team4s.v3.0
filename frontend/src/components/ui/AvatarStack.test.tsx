// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

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
})
