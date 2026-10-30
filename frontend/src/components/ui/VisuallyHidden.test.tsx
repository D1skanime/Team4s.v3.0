// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { VisuallyHidden } from './VisuallyHidden'

describe('VisuallyHidden', () => {
  it('rendert den Inhalt im DOM und für Screenreader erreichbar', () => {
    render(<VisuallyHidden>Geheimer Text</VisuallyHidden>)
    expect(screen.getByText('Geheimer Text')).not.toBeNull()
  })

  it('rendert standardmäßig ein span, kann aber ein anderes Element nutzen', () => {
    render(<VisuallyHidden as="p">Absatz-Text</VisuallyHidden>)
    const node = screen.getByText('Absatz-Text')
    expect(node.tagName).toBe('P')
  })
})
