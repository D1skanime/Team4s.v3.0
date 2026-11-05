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

export const BeschriftungMitZusatzinfo: Story = {
  name: 'Beschriftung + Zusatzinfo (gap "labelWithTrailingMeta")',
  args: {
    gap: 'labelWithTrailingMeta',
    justify: 'between',
    wrap: false,
    children: (
      <>
        <Chip label="Episodentitel" />
        <Chip label="3 Versionen" />
      </>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: 'Eine Hauptbeschriftung links und eine an das Zeilenende gedrückte, untergeordnete Zusatzinfo rechts (z. B. die Episodenkarten-Kopfzeile aus `EpisodeGlassCard`: Titel-Block + Versionszähler-Badge). Enger als "contentPair", weil die zweite Spalte hier keine gleichrangige Inhaltsspalte ist, sondern nur eine kurze Zusatzinfo.',
      },
    },
  },
}

export const BildMitBildunterschrift: Story = {
  name: 'Bild + Bildunterschrift (gap "mediaCaption")',
  args: {
    gap: 'mediaCaption',
    align: 'start',
    wrap: false,
    children: (
      <>
        <span style={{ width: 48, height: 68, background: '#555', borderRadius: 4, flexShrink: 0 }} />
        <Chip label="Titel und Typ des Vorschaubilds" />
      </>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: 'Ein Vorschaubild neben seiner Bildunterschrift (z. B. die Randnavigations-Vorschaukarte aus `AnimeEdgeNavigation`: Cover-Thumbnail + Titel/Typ-Textblock).',
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

export const HaltepunktUmkehr: Story = {
  name: 'Haltepunkt-Umkehr (collapseBelow="md")',
  args: {
    collapseBelow: 'md',
    gap: 'contentPair',
    gapCollapsed: 'independentBlocks',
    justify: 'between',
    children: (
      <>
        <Chip label="Titel + Logo" />
        <Chip label="Externer Link" />
      </>
    ),
  },
  decorators: [
    (Story) => (
      <div style={{ resize: 'horizontal', overflow: 'auto', border: '1px dashed #999', padding: 8, width: '100%', maxWidth: 900 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story:
          'Kippt von einer horizontalen Zeile auf eine gestapelte Spalte, sobald der umgebende Container unter 48rem/768px schmaler wird -- ziehen Sie den gestrichelten Rahmen rechts unten enger, um den Wechsel live zu sehen. Mit eigenem, engerem Lücken-Zweck (`gapCollapsed="independentBlocks"`) für den gestapelten Zustand. Deckt zwei reale Fälle ab: die Titel+Logo-Kopfzeile des Anime-Kopfs und die Gruppenname/Avatar-Paarung einer Release-Zeile -- beide kippen an derselben 768px-Schwelle.',
      },
    },
  },
}
