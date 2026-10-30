import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/nextjs'

import { NavArrow } from './NavArrow'

/**
 * Pfeil-Knopf für Karussell-, Galerie- und Seiten-Navigation.
 */
const meta = {
  title: 'Zusammengesetzte Bausteine/NavArrow',
  component: NavArrow,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Besteht aus: IconButton.',
      },
    },
  },
} satisfies Meta<typeof NavArrow>

export default meta
type Story = StoryObj<typeof meta>

const BILDER = ['#5f84dd', '#1f9d63', '#993556']

function Bildergalerie() {
  const [index, setIndex] = useState(0)

  return (
    <div style={{ position: 'relative', width: 320, height: 200, background: BILDER[index], display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12 }}>
      <NavArrow direction="previous" label="Vorheriges Bild" size="lg" onClick={() => setIndex((current) => (current - 1 + BILDER.length) % BILDER.length)} />
      <NavArrow direction="next" label="Nächstes Bild" size="lg" onClick={() => setIndex((current) => (current + 1) % BILDER.length)} />
    </div>
  )
}

export const ImEinsatz: Story = {
  name: 'Im Einsatz (Bild mit Vor/Zurück)',
  args: { direction: 'next', label: 'Nächstes Bild' },
  render: () => <Bildergalerie />,
}

export const Klein: Story = {
  args: { direction: 'next', label: 'Nächste Seite', size: 'sm', onClick: () => {} },
}

export const Deaktiviert: Story = {
  args: { direction: 'next', label: 'Nächste Seite', disabled: true, onClick: () => {} },
}
