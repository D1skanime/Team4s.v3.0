import type { Meta, StoryObj } from '@storybook/nextjs'
import type { ReactNode } from 'react'

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

function MultilineChip({ children }: { children: ReactNode }) {
  return (
    <span style={{ display: 'block', padding: '4px 12px', background: '#eee', border: '1px solid #ccc', borderRadius: 8, minWidth: 0 }}>
      {children}
    </span>
  )
}

export const WachsendeTextspalteMitFixierterAktion: Story = {
  name: 'Wachsende Textspalte mit fixierter Aktion (growFirstChild + pinLastChild)',
  args: {
    gap: 'contentPair',
    justify: 'between',
    align: 'stretch',
    growFirstChild: true,
    pinLastChild: true,
    wrap: false,
    children: (
      <MultilineChip>
        <strong>Gruppenname</strong>
        <br />
        Release-Titel · 1080p · mkv · h264
        <br />
        Veröffentlicht am 07.01.2024
      </MultilineChip>
    ),
  },
  render: (args) => (
    <div style={{ maxWidth: 480 }}>
      <Cluster {...args}>
        {args.children}
        <Button type="button" variant="secondary" size="sm">Zum Release →</Button>
      </Cluster>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          '`growFirstChild` lässt die mehrzeilige Textspalte auf den nach der Aktion verbleibenden Platz wachsen; `pinLastChild` hält die Aktion dabei auf ihrer eigenen Höhe statt sie über `align="stretch"` auf die volle, durch die Textspalte vorgegebene Zeilenhöhe zu strecken (z. B. die Release-Zeile aus `ReleasePreviewRow`: Gruppenname+Metadaten links, "Zum Release"-Button rechts).',
      },
    },
  },
}

function AvatarPlaceholder({ initials }: { initials: string }) {
  return (
    <span
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 32,
        height: 32,
        borderRadius: '50%',
        background: '#444',
        color: '#fff',
        fontSize: 12,
        flexShrink: 0,
      }}
    >
      {initials}
    </span>
  )
}

export const NichtSchrumpfendeAvatarGruppe: Story = {
  name: 'Nicht schrumpfende Avatar-Gruppe (shrink={false})',
  args: {
    gap: 'badgeRow',
    shrink: false,
    children: (
      <>
        <AvatarPlaceholder initials="DF" />
        <AvatarPlaceholder initials="ZG" />
      </>
    ),
  },
  render: (args) => (
    <div style={{ maxWidth: 260 }}>
      <Cluster gap="contentPair" align="start" wrap={false}>
        <Cluster {...args} />
        <MultilineChip>
          <strong>Demo Fansub-Gruppe × Zweite Gruppe</strong>
          <br />
          Ein sehr langer Release-Titel, der die Textspalte zum Schrumpfen zwingt
        </MultilineChip>
      </Cluster>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          '`shrink={false}` hält DIESEN Cluster auf seiner eigenen Breite, auch wenn der äußere Cluster bei knappem Platz schrumpfen würde -- z. B. die Avatar-Gruppe einer Release-Zeile, die trotz einer daneben wachsenden, langen Textspalte ihre volle Breite behalten soll (im Unterschied zu `pinLastChild`, das ein KIND dieses Clusters betrifft, nicht den Cluster selbst als Kind seines Elternelements).',
      },
    },
  },
}

export const SekundaerAktionsreihe: Story = {
  name: 'Sekundär-Aktionsreihe (gap "secondaryActionRow")',
  args: {
    gap: 'secondaryActionRow',
    justify: 'end',
    children: (
      <>
        <Button type="button" variant="secondary" size="sm">
          Zur Fansub-Gruppe
        </Button>
        <Button type="button" variant="secondary" size="sm">
          Zum Projekt
        </Button>
      </>
    ),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Dichte, rechtsbündige Reihe von 1-2 gleichrangigen Sekundär-Aktions-Buttons (z. B. "Zur Fansub-Gruppe"/"Zum Projekt" in `FansubGroupContext`s Navigationszeile) -- enger als "actionRow" (24px, meist durch eine Trennlinie abgesetzt) und bewusst NICHT "badgeRow" (dort explizit ohne Interaktion), obwohl beide denselben 8px-Wert tragen.',
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

/* Gemeinsamer Rahmen-Baustein fuer beide Haltepunkt-Varianten unten: das schwebende Band
   positioniert sich relativ zu seinem positionierten Vorfahren, dieser Rahmen stellt genau das
   bereit. Als JSX-Komponente statt eines generisch typisierten Dekorators, da Storybooks
   DecoratorFunction-Typ keinen eigenstaendigen Funktionswert ausserhalb eines Dekorator-Arrays
   erlaubt. */
function FloatDemoFrame({ children }: { children: ReactNode }) {
  return (
    <div style={{ position: 'relative', border: '1px dashed #999', padding: '48px 8px 8px', width: '100%', maxWidth: 900, minHeight: 80, background: '#2228' }}>
      {children}
    </div>
  )
}

const schwebeOverlayArgs = {
  float: 'controlBand' as const,
  gap: 'contentPair' as const,
  justify: 'between' as const,
  children: (
    <>
      <Chip label="← Vorheriger" />
      <Chip label="Nächster →" />
    </>
  ),
}

const schwebeOverlayDescription =
  'Eine Steuerelement-Reihe, die oberhalb von 768px präzise als schwebendes Band auf dem oberen Rand ihres ' +
  'positionierten Vorfahren sitzt (z. B. die Randnavigations-Pfeile über einem Anime-Kopf), unterhalb davon eine ' +
  'normale, zentrierte Zeile im Textfluss. Die Umschaltung reagiert bewusst auf die tatsächliche Viewport-Breite ' +
  '(Storybooks Viewport-Werkzeug oben), NICHT auf die Breite eines umgebenden Containers -- anders als bei ' +
  '"Haltepunkt-Umkehr" oben kann das schwebende Band nicht per Container-Abfrage funktionieren, weil eine ' +
  'Container-Abfrage laut Spezifikation nie das eigene Container-Wurzelelement selbst umordnen darf, dieses ' +
  'Wurzelelement hier aber genau dasjenige ist, das verschwinden/erscheinen muss. Der Container selbst blockiert ' +
  'keine Klicks auf darunterliegenden Inhalt (`pointer-events:none`), nur die beiden Chips selbst bleiben ' +
  'anklickbar (`pointer-events:auto`).'

export const SchwebeOverlayModusDesktop: Story = {
  name: 'Schwebe-Overlay-Modus Desktop (float="controlBand")',
  args: schwebeOverlayArgs,
  decorators: [(Story) => <FloatDemoFrame><Story /></FloatDemoFrame>],
  parameters: {
    viewport: { value: 'desktop1440' },
    docs: { description: { story: schwebeOverlayDescription } },
  },
}

export const SchwebeOverlayModusMobil: Story = {
  name: 'Schwebe-Overlay-Modus Mobil (float="controlBand")',
  args: schwebeOverlayArgs,
  decorators: [(Story) => <FloatDemoFrame><Story /></FloatDemoFrame>],
  parameters: {
    viewport: { value: 'mobile390' },
    docs: { description: { story: schwebeOverlayDescription } },
  },
}
