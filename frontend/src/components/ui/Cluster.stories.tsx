import type { Meta, StoryObj } from '@storybook/nextjs'

import { Cluster } from './Cluster'

/** Horizontale Anordnung mit Umbruch und token-basiertem Abstand -- der generische Grundbaustein
 *  für jede Chip-/Badge-/Logo-Reihe. Setzt selbst keine Fläche/Farbe/Rundung. */
const meta = {
  title: 'Grundbausteine/Cluster',
  component: Cluster,
  tags: ['autodocs'],
} satisfies Meta<typeof Cluster>

export default meta
type Story = StoryObj<typeof meta>

function Chip({ label }: { label: string }) {
  return (
    <span style={{ padding: '4px 12px', background: '#eee', border: '1px solid #ccc', borderRadius: 999 }}>
      {label}
    </span>
  )
}

export const Standard: Story = {
  name: 'Standard (gap 2)',
  args: {
    gap: '2',
    children: (
      <>
        <Chip label="Tag A" />
        <Chip label="Tag B" />
        <Chip label="Tag C" />
      </>
    ),
  },
}

export const GapBreit: Story = {
  name: 'Breiter Abstand (gap 4)',
  args: {
    gap: '4',
    children: (
      <>
        <Chip label="Logo-Gruppe" />
        <Chip label="Zweite Gruppe" />
      </>
    ),
  },
}

export const GapSehrBreit: Story = {
  name: 'Sehr breiter Abstand (gap 5)',
  args: {
    gap: '5',
    children: (
      <>
        <Chip label="Erste Spalte" />
        <Chip label="Zweite Spalte" />
      </>
    ),
  },
}

export const OhneUmbruch: Story = {
  name: 'Ohne Umbruch (wrap=false)',
  args: {
    wrap: false,
    children: (
      <>
        <Chip label="Eins" />
        <Chip label="Zwei" />
        <Chip label="Drei" />
        <Chip label="Vier" />
        <Chip label="Fünf" />
        <Chip label="Sechs" />
      </>
    ),
  },
}

export const JustifyBetween: Story = {
  name: 'Verteilt (justify="between")',
  args: {
    justify: 'between',
    children: (
      <>
        <Chip label="Links" />
        <Chip label="Rechts" />
      </>
    ),
  },
}
