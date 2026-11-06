import type { Meta, StoryObj } from '@storybook/nextjs'

import { StackingRow } from './StackingRow'

/** Zeile mit genau einem Zweck: Teile nebeneinander, sobald der eigene Container-Platz reicht,
 *  sonst untereinander gestapelt -- entscheidet selbst per `@container`-Abfrage auf sich selbst,
 *  nie über die Bildschirmbreite. Setzt selbst keine Fläche/Farbe/Rundung. */
const meta = {
  title: 'Grundbausteine/StackingRow',
  component: StackingRow,
  tags: ['autodocs'],
} satisfies Meta<typeof StackingRow>

export default meta
type Story = StoryObj<typeof meta>

function Titelblock() {
  return (
    <span style={{ display: 'block', minWidth: 0 }}>
      <span style={{ display: 'block', fontSize: 12, opacity: 0.65 }}>Folge 12</span>
      <span style={{ display: 'block', fontWeight: 600 }}>
        Die unglaublich lange Episode über das Geheimnis unter den Kirschblüten der alten Schule
      </span>
      <span style={{ display: 'block', fontSize: 12, opacity: 0.65 }}>Canon · Episode</span>
    </span>
  )
}

function Versionszaehler() {
  return <span style={{ flexShrink: 0, whiteSpace: 'nowrap', fontSize: 12, opacity: 0.65 }}>3 Versionen</span>
}

export const BreiterContainer: Story = {
  name: 'Breiter Container (Zeilen-Anordnung)',
  decorators: [
    (Story) => (
      <div style={{ width: 480, border: '1px dashed #999', padding: 8 }}>
        <Story />
      </div>
    ),
  ],
  args: {
    children: (
      <>
        <Titelblock />
        <Versionszaehler />
      </>
    ),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Reicht der eigene Container-Platz (hier 480px, oberhalb der 20rem-Schwelle), stehen beide ' +
          'Teile nebeneinander -- der Titelblock wächst auf den nach dem Versionszähler verbleibenden ' +
          'Platz, sein langer Titel bricht dort intern um.',
      },
    },
  },
}

export const SchmalerContainer: Story = {
  name: 'Schmaler Container (gestapelt)',
  decorators: [
    (Story) => (
      <div style={{ width: 240, border: '1px dashed #999', padding: 8 }}>
        <Story />
      </div>
    ),
  ],
  args: {
    children: (
      <>
        <Titelblock />
        <Versionszaehler />
      </>
    ),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Derselbe Inhalt, aber in einem 240px schmalen Container (unterhalb der 20rem/320px-Schwelle) ' +
          '-- StackingRow stapelt Titelblock und Versionszähler stattdessen untereinander, jeder Teil auf ' +
          'voller Breite, statt eine zu enge Zeile zu erzwingen. Genau dieser Fall tritt real in ' +
          '`EpisodeGlassCard` auf, wenn der Titel-Slot einer aufgeklappten Kopfzeile auf schmaler ' +
          'Bildschirmbreite selbst nur wenig Platz erhält.',
      },
    },
  },
}

export const GrosseResizen: Story = {
  name: 'Haltepunkt live ausprobieren',
  decorators: [
    (Story) => (
      <div style={{ resize: 'horizontal', overflow: 'auto', border: '1px dashed #999', padding: 8, width: 480, maxWidth: 900, minWidth: 160 }}>
        <Story />
      </div>
    ),
  ],
  args: {
    children: (
      <>
        <Titelblock />
        <Versionszaehler />
      </>
    ),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Ziehen Sie den gestrichelten Rahmen rechts unten enger, um den Wechsel zwischen Zeilen-Anordnung ' +
          'und gestapeltem Zustand bei 20rem/320px live zu sehen -- eine echte `@container`-Abfrage auf den ' +
          'Baustein selbst reagiert auf Größenänderungen des Containers, nicht auf das Browserfenster.',
      },
    },
  },
}
