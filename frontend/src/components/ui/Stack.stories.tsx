import type { Meta, StoryObj } from '@storybook/nextjs'

import { Stack } from './Stack'

/** Vertikale Anordnung mit festem, token-basiertem Abstand -- der generische Grundbaustein für
 *  jede Kopf-zu-Fuß-Anordnung. Setzt selbst keine Fläche/Farbe/Rundung. */
const meta = {
  title: 'Grundbausteine/Stack',
  component: Stack,
  tags: ['autodocs'],
} satisfies Meta<typeof Stack>

export default meta
type Story = StoryObj<typeof meta>

function Box({ label }: { label: string }) {
  return (
    <div style={{ padding: 16, background: '#eee', border: '1px solid #ccc' }}>{label}</div>
  )
}

export const Abschnittstrennung: Story = {
  name: 'Abschnittstrennung',
  args: {
    gap: 'section',
    children: (
      <>
        <Box label="Erste Zeile" />
        <Box label="Zweite Zeile" />
        <Box label="Dritte Zeile" />
      </>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: 'Für voneinander unabhängige Inhaltsblöcke (z. B. Merklisten-Knopf, Trennlinie und Genre-Abschnitt im Anime-Kopf, oder einzelne Episodenzeilen in einer Liste).',
      },
    },
  },
}

export const EngZusammengehoerig: Story = {
  name: 'Eng zusammengehörig',
  args: {
    gap: 'tight',
    children: (
      <>
        <Box label="Erste Zeile" />
        <Box label="Zweite Zeile" />
      </>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: 'Für dicht zusammengehörige Inhalte (z. B. ein Eyebrow-Label mit seiner Chip-Reihe, oder die Metadatenzeilen EINER Release-Zeile).',
      },
    },
  },
}

export const AusrichtungStart: Story = {
  name: 'Ausrichtung start',
  args: {
    gap: 'section',
    align: 'start',
    children: (
      <>
        <Box label="Kurz" />
        <div style={{ padding: 16, background: '#eee', border: '1px solid #ccc', width: 240 }}>Breiter Block</div>
      </>
    ),
  },
}

export const AusrichtungEnd: Story = {
  name: 'Ausrichtung end',
  args: {
    gap: 'section',
    align: 'end',
    children: (
      <>
        <Box label="Kurz" />
        <div style={{ padding: 16, background: '#eee', border: '1px solid #ccc', width: 240 }}>Breiter Block</div>
      </>
    ),
  },
}
