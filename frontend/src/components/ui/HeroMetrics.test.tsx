// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { HeroMetrics } from './HeroMetrics'

describe('HeroMetrics', () => {
  it('ordnet Bezeichnungen vor den hervorgehobenen Werten an', () => {
    render(
      <HeroMetrics
        ariaLabel="Kennzahlen"
        items={[
          { label: 'Dauer', value: '23:45 Min.' },
          { label: 'Codec', value: 'H.264' },
        ]}
      />,
    )

    const metrics = screen.getByLabelText('Kennzahlen')
    expect(metrics.textContent).toBe('Dauer23:45 Min.CodecH.264')
  })
})
