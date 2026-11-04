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

export const UnabhaengigeBloecke: Story = {
  name: 'Unabhängige Blöcke',
  args: {
    gap: 'independentBlocks',
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
        story: 'Für voneinander unabhängige Inhaltsblöcke INNERHALB eines Bausteins (z. B. Merklisten-Knopf, Trennlinie und Genre-Abschnitt im Anime-Kopf, oder einzelne Episodenzeilen in einer Liste) -- nicht zu verwechseln mit Abstand zwischen Seitenabschnitten.',
      },
    },
  },
}

export const ZusammengehoerigerInhalt: Story = {
  name: 'Zusammengehöriger Inhalt',
  args: {
    gap: 'relatedContent',
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
        story: 'Für dicht zusammengehörige Inhalte, die gemeinsam EINE Einheit beschreiben (z. B. ein Eyebrow-Label mit seiner Chip-Reihe, oder die Metadatenzeilen EINER Release-Zeile).',
      },
    },
  },
}

export const AusrichtungStart: Story = {
  name: 'Ausrichtung start',
  args: {
    gap: 'independentBlocks',
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
    gap: 'independentBlocks',
    align: 'end',
    children: (
      <>
        <Box label="Kurz" />
        <div style={{ padding: 16, background: '#eee', border: '1px solid #ccc', width: 240 }}>Breiter Block</div>
      </>
    ),
  },
}
