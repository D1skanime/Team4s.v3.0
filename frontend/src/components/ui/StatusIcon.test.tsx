// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { Info } from 'lucide-react'

import { StatusIcon } from './StatusIcon'

describe('StatusIcon', () => {
  it('rendert das übergebene Icon dekorativ (aria-hidden)', () => {
    const { container } = render(<StatusIcon icon={<Info size={18} />} />)

    const root = container.firstElementChild
    expect(root?.getAttribute('aria-hidden')).toBe('true')
  })

  it('nutzt per Standard die neutrale Tonalität', () => {
    const { container } = render(<StatusIcon icon={<Info size={18} />} />)

    expect(container.firstElementChild?.className).toMatch(/statusIconNeutral/)
  })

  it('unterstützt alle fünf Tonalitäten', () => {
    const tones: Array<'neutral' | 'info' | 'success' | 'warning' | 'danger'> = [
      'neutral',
      'info',
      'success',
      'warning',
      'danger',
    ]

    for (const tone of tones) {
      const { container } = render(<StatusIcon tone={tone} icon={<Info size={18} />} />)
      const className = container.firstElementChild?.className ?? ''
      expect(className.toLowerCase()).toContain(tone.toLowerCase())
    }
  })

  it('skaliert über die size-Prop (sm/md/lg)', () => {
    const { container: sm } = render(<StatusIcon size="sm" icon={<Info size={14} />} />)
    const { container: lg } = render(<StatusIcon size="lg" icon={<Info size={22} />} />)

    expect(sm.firstElementChild?.className).toMatch(/statusIconSm/)
    expect(lg.firstElementChild?.className).toMatch(/statusIconLg/)
  })
})
