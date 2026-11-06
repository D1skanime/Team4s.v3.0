import type { Meta, StoryObj } from '@storybook/nextjs'

import { SplitLayout } from './SplitLayout'

/** Feste/automatische erste Spalte + flexible Restspalte, die unterhalb eines festen
 *  Container-Query-Haltepunkts (768px) stapelt. Setzt selbst keine Flaeche/Farbe/Rundung. Die
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
  name: 'Breiter Container (nebeneinander, ab 768px)',
  decorators: [(Story) => <div style={{ width: 900 }}><Story /></div>],
  args: {
    firstColumn: <ColumnA />,
    secondColumn: <ColumnB />,
    firstColumnWidth: 'poster',
  },
}

export const Schmal: Story = {
  name: 'Schmaler Container (gestapelt, unterhalb 768px)',
  decorators: [(Story) => <div style={{ width: 320 }}><Story /></div>],
  args: {
    firstColumn: <ColumnA />,
    secondColumn: <ColumnB />,
    firstColumnWidth: 'poster',
  },
}

function KurzeSpalte() {
  return <div style={{ padding: 16, background: '#dde', border: '1px solid #99b', height: '100%' }}>Kurzer Inhalt</div>
}

function LangeSpalte() {
  return (
    <div style={{ padding: 16, background: '#eee', border: '1px solid #ccc', height: '100%' }}>
      Deutlich längerer Inhalt über mehrere Zeilen, der die Spaltenhöhe von sich aus nach oben
      zieht -- die kürzere Nachbarspalte soll bei align=&quot;stretch&quot; vollständig mitwachsen,
      nicht nur bis zu ihrer eigenen Inhaltshöhe.
    </div>
  )
}

export const GestreckteSpaltenHoehe: Story = {
  name: 'Gestreckte Spaltenhöhe (align="stretch")',
  // 900px, nicht 700px: SplitLayouts eigener Haltepunkt liegt bei 48rem/768px -- ein schmalerer
  // Demo-Container würde die Spalten (wie in Schmal oben, dort gewollt) stapeln statt sie
  // nebeneinander zu zeigen, was genau die hier zu demonstrierende Höhenangleichung verdeckt.
  decorators: [(Story) => <div style={{ width: 900 }}><Story /></div>],
  args: {
    firstColumn: <KurzeSpalte />,
    secondColumn: <LangeSpalte />,
    firstColumnWidth: 'poster',
    align: 'stretch',
  },
  parameters: {
    docs: {
      description: {
        story:
          'align="stretch" lässt beide Spalten-Flächen bis zur Höhe der jeweils höheren Spalte reichen -- `firstColumn`/`secondColumn` reichen ihre so ausgeglichene Höhe über `display:flex;flex-direction:column`+`flex:1` an ihr jeweils einziges Kind weiter, statt dass das Kind bei seiner eigenen, kürzeren Inhaltshöhe stehen bleibt (z. B. die Poster-/Info-Karten des Anime-Kopfs, die trotz unterschiedlich langer Inhalte auf gleicher Höhe enden müssen).',
      },
    },
  },
}
