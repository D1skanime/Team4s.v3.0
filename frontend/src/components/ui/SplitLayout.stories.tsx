import type { Meta, StoryObj } from '@storybook/nextjs'

import { SplitLayout } from './SplitLayout'

/** Feste/automatische erste Spalte + flexible Restspalte, die unterhalb eines konfigurierbaren
 *  Container-Query-Haltepunkts stapelt. Setzt selbst keine Flaeche/Farbe/Rundung. Die
 *  Haltepunkt-Schwelle reagiert auf die verfuegbare Breite des umschliessenden Elements
 *  (Container-Query), nicht auf die Browser-Fensterbreite -- die Demo-Storys stellen das ueber
 *  eine Wrapper-Breite dar statt ueber den Storybook-Viewport-Umschalter. */
const meta = {
  title: 'Grundbausteine/SplitLayout',
  component: SplitLayout,
  tags: ['autodocs'],
} satisfies Meta<typeof SplitLayout>

export default meta
type Story = StoryObj<typeof meta>

function ColumnA() {
  return <div style={{ padding: 16, background: '#dde', border: '1px solid #99b' }}>Spalte 1 (fest/auto)</div>
}

function ColumnB() {
  return (
    <div style={{ padding: 16, background: '#eee', border: '1px solid #ccc' }}>
      Spalte 2 (flexibel, minmax(0,1fr))
    </div>
  )
}

export const Standard: Story = {
  name: 'Breiter Container (nebeneinander, breakpoint="md", ab 768px)',
  decorators: [(Story) => <div style={{ width: 900 }}><Story /></div>],
  args: {
    firstColumn: <ColumnA />,
    secondColumn: <ColumnB />,
    firstColumnWidth: '200px',
  },
}

export const Schmal: Story = {
  name: 'Schmaler Container (gestapelt, unterhalb 768px)',
  decorators: [(Story) => <div style={{ width: 320 }}><Story /></div>],
  args: {
    firstColumn: <ColumnA />,
    secondColumn: <ColumnB />,
    firstColumnWidth: '200px',
  },
}

export const BreakpointLgGestapelt: Story = {
  name: 'Haltepunkt lg -- noch gestapelt bei 900px (unterhalb 1024px)',
  decorators: [(Story) => <div style={{ width: 900 }}><Story /></div>],
  args: {
    firstColumn: <ColumnA />,
    secondColumn: <ColumnB />,
    firstColumnWidth: 'auto',
    breakpoint: 'lg',
  },
  parameters: {
    docs: {
      description: {
        story: 'Bei 900px Containerbreite noch gestapelt (unterhalb der 1024px-lg-Schwelle) -- im Unterschied zur Standard-Story bei derselben Breitenklasse mit breakpoint="md" (dort bereits nebeneinander).',
      },
    },
  },
}

export const BreakpointLgNebeneinander: Story = {
  name: 'Haltepunkt lg -- nebeneinander ab 1024px',
  decorators: [(Story) => <div style={{ width: 1100 }}><Story /></div>],
  args: {
    firstColumn: <ColumnA />,
    secondColumn: <ColumnB />,
    firstColumnWidth: 'auto',
    breakpoint: 'lg',
  },
}
