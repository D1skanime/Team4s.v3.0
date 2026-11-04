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

export const Standard: Story = {
  name: 'Standard (gap 3)',
  args: {
    gap: '3',
    children: (
      <>
        <Box label="Erste Zeile" />
        <Box label="Zweite Zeile" />
        <Box label="Dritte Zeile" />
      </>
    ),
  },
}

export const GapEng: Story = {
  name: 'Enger Abstand (gap 2)',
  args: {
    gap: '2',
    children: (
      <>
        <Box label="Erste Zeile" />
        <Box label="Zweite Zeile" />
      </>
    ),
  },
}

export const AusrichtungStart: Story = {
  name: 'Ausrichtung start',
  args: {
    gap: '3',
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
    gap: '3',
    align: 'end',
    children: (
      <>
        <Box label="Kurz" />
        <div style={{ padding: 16, background: '#eee', border: '1px solid #ccc', width: 240 }}>Breiter Block</div>
      </>
    ),
  },
}
