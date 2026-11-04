import type { Meta, StoryObj } from '@storybook/nextjs'

import { Button } from './Button'
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

export const AbzeichenReihe: Story = {
  name: 'Abzeichen-Reihe (gap "badgeRow")',
  args: {
    gap: 'badgeRow',
    children: (
      <>
        <Chip label="Tag A" />
        <Chip label="Tag B" />
        <Chip label="Tag C" />
      </>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: 'Dichte, rein lesbare Abzeichen-/Chip-/Tag-/Logo-Reihe ohne Interaktion (z. B. Genre-/Status-/Tag-Chips im Anime-Kopf).',
      },
    },
  },
}

function InteractiveChip({ label, pressed }: { label: string; pressed: boolean }) {
  return (
    <Button type="button" variant="secondary" size="sm" aria-pressed={pressed}>
      {label}
    </Button>
  )
}

export const InteraktiveChipReihe: Story = {
  name: 'Interaktive Chip-Reihe (gap "interactiveChipRow")',
  args: {
    gap: 'interactiveChipRow',
    as: 'div',
    role: 'group',
    'aria-label': 'Fansub-Gruppe',
    children: (
      <>
        <InteractiveChip label="Alle" pressed={false} />
        <InteractiveChip label="Gruppe A" pressed />
        <InteractiveChip label="Gruppe B" pressed={false} />
      </>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: 'Reihe klickbarer Filter-/Auswahl-Chips (z. B. der Fansub-Gruppen-Umschalter in `FansubGroupPicker`) -- echte `Button`-Grundbausteine (mit `aria-pressed`) statt der rein lesbaren `Chip`-Spanne oben, weil der visuelle Unterschied zwischen anklickbaren Chips und statischen Abzeichen genau der Zweck dieser Variante ist.',
      },
    },
  },
}

export const ZweiBloeckeNebeneinander: Story = {
  name: 'Zwei Blöcke nebeneinander (gap "contentPair")',
  args: {
    gap: 'contentPair',
    children: (
      <>
        <Chip label="Logo-Gruppe" />
        <Chip label="Zweite Gruppe" />
      </>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: 'Zwei unterschiedliche, gleichrangige Inhaltsblöcke nebeneinander (z. B. Avatar-Gruppe neben Textspalte in einer Release-Zeile).',
      },
    },
  },
}

export const Aktionsreihe: Story = {
  name: 'Aktionsreihe (gap "actionRow")',
  args: {
    gap: 'actionRow',
    children: (
      <>
        <Chip label="Erste Spalte" />
        <Chip label="Zweite Spalte" />
      </>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: 'Aktionslink-Reihe, meist durch eine Trennlinie vom Inhalt oben abgesetzt (z. B. der externe Emby-Link im Anime-Kopf).',
      },
    },
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
