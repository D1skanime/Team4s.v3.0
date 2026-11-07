import type { Meta, StoryObj } from '@storybook/nextjs'
import { useState } from 'react'

import { BannerSection } from '@/components/ui/BannerSection'
import { Stack } from '@/components/ui/Stack'
import { Text } from '@/components/ui/Text'
import { storybookDocsLink } from '@/lib/storybookLinks'
import type { PublicGroupedEpisode } from '@/types/episodeVersion'

import { EpisodeGlassCard } from './EpisodeGlassCard'

function buildEpisode(overrides: Partial<PublicGroupedEpisode> = {}): PublicGroupedEpisode {
  return {
    episode_id: 1,
    episode_number: 1,
    episode_title: 'Der erste Kirschblütentag',
    default_version_id: 1,
    version_count: 1,
    versions: [],
    filler_type: 'canon',
    episode_type: 'episode',
    filler_type_label: 'Canon',
    episode_type_label: 'Episode',
    ...overrides,
  }
}

/** Interaktiver Demo-Wrapper -- EpisodeGlassCard verwaltet seinen Auf-/Zugeklappt-Zustand nicht
 *  selbst (Elternteil-Props `expanded`/`onToggle`), die Story simuliert das über lokalen State. */
function EpisodeGlassCardDemo({
  episode,
  episodeTitle,
  initiallyExpanded = false,
  versionsLabel = 'Platzhalter für Release-Versionszeilen (ReleasePreviewRow).',
}: {
  episode: PublicGroupedEpisode
  episodeTitle: string
  initiallyExpanded?: boolean
  versionsLabel?: string
}) {
  const [expanded, setExpanded] = useState(initiallyExpanded)
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 12 }}>
      <EpisodeGlassCard
        episode={episode}
        episodeTitle={episodeTitle}
        expanded={expanded}
        onToggle={() => setExpanded((value) => !value)}
        panelId="demo-panel"
      >
        <Text tone="onScrim">{versionsLabel}</Text>
      </EpisodeGlassCard>
    </ul>
  )
}

/** Demo-Wrapper für EINE Karte innerhalb der Mehrfach-Listen-Story -- jede Karte verwaltet ihren
 *  Auf-/Zuklapp-Zustand unabhängig von den übrigen Listeneinträgen (eigener lokaler State je Karte). */
function EpisodeGlassCardListItemDemo({
  episode,
  episodeTitle,
  initiallyExpanded = false,
  panelId,
}: {
  episode: PublicGroupedEpisode
  episodeTitle: string
  initiallyExpanded?: boolean
  panelId: string
}) {
  const [expanded, setExpanded] = useState(initiallyExpanded)
  return (
    <EpisodeGlassCard
      episode={episode}
      episodeTitle={episodeTitle}
      expanded={expanded}
      onToggle={() => setExpanded((value) => !value)}
      panelId={panelId}
    >
      <Text tone="onScrim">Platzhalter für Release-Versionszeilen (ReleasePreviewRow).</Text>
    </EpisodeGlassCard>
  )
}

/** Demo-Wrapper für die Mehrfach-Listen-Story -- bildet die reale Anordnung aus
 *  `FansubVersionBrowser` nach: mehrere EpisodeGlassCard-<li>-Elemente innerhalb EINES
 *  gemeinsamen `Stack as="ul" gap="listRows"` statt eines hier nachgebauten Rasters, damit
 *  eine spätere Abstandsänderung an Stack automatisch hier mitkommt. */
function EpisodeGlassCardListDemo() {
  return (
    <Stack as="ul" gap="listRows" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      <EpisodeGlassCardListItemDemo
        episode={buildEpisode({ episode_id: 1, episode_number: 1, filler_type: 'canon', filler_type_label: 'Canon' })}
        episodeTitle="Der erste Kirschblütentag"
        panelId="demo-panel-list-1"
      />
      <EpisodeGlassCardListItemDemo
        episode={buildEpisode({ episode_id: 2, episode_number: 2, filler_type: 'filler', filler_type_label: 'Filler' })}
        episodeTitle="Ein ruhiger Nachmittag im Dorf"
        initiallyExpanded
        panelId="demo-panel-list-2"
      />
      <EpisodeGlassCardListItemDemo
        episode={buildEpisode({ episode_id: 3, episode_number: 3, filler_type: 'canon', filler_type_label: 'Canon' })}
        episodeTitle="Das Geheimnis unter der alten Brücke"
        panelId="demo-panel-list-3"
      />
    </Stack>
  )
}

/** Episodenkarte für den öffentlichen Fansub-/Release-Browser -- besteht aus Card (Glas-Fläche +
 *  Tönungs-Hook, zusätzlich verschachtelt für die aufgeklappte Versionsliste), DisclosureTrigger
 *  (auf-/zuklappbare Kopfzeile), Divider (Trennlinie vor der Versionsliste), Text
 *  (Episodennummer/-titel/Klassifikation/Versionszähler) und StackingRow (responsive Kopfzeile).
 *  Rendert immer auf Bannerhintergrund (konsistent mit Ebene 1). */
const meta = {
  title: 'Zusammengesetzte Bausteine/EpisodenKarte',
  component: EpisodeGlassCardDemo,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          `Besteht aus: ${storybookDocsLink('Grundbausteine/Card', 'Card')} (variant="glass" + ` +
          `Tönungs-Hook für die Karte selbst, variant="flat" padding="dividedSection" für die ` +
          `aufgeklappte Versionsliste), ${storybookDocsLink('Grundbausteine/DisclosureTrigger', 'DisclosureTrigger')} ` +
          `(Kopfzeile), ${storybookDocsLink('Grundbausteine/Divider', 'Divider')} (Trennlinie vor der ` +
          `Versionsliste), ${storybookDocsLink('Grundbausteine/Text', 'Text')} (Episodennummer/-titel/` +
          `Klassifikation/Versionszähler) und ${storybookDocsLink('Grundbausteine/StackingRow', 'StackingRow')} ` +
          '(responsive Kopfzeile: ordnet Titelblock und Versionszähler nebeneinander an und stapelt sie ' +
          'stattdessen untereinander, sobald der eigene Platz im Titel-Slot der aufgeklappten Kopfzeile ' +
          'dafür nicht reicht). Die Episodentyp→Farbton-Zuordnung (canon/filler/mixed/recap) ' +
          'ist Domänenwissen dieser Komponente, nicht von Card.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ position: 'relative', minHeight: 220, padding: 20 }}>
        <BannerSection imageUrl="/covers/placeholder.jpg" imageAlt="Bannerhintergrund" withTextScrim />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <Story />
        </div>
      </div>
    ),
  ],
} satisfies Meta<typeof EpisodeGlassCardDemo>

export default meta
type Story = StoryObj<typeof meta>

export const Canon: Story = {
  args: {
    episode: buildEpisode({ filler_type: 'canon', filler_type_label: 'Canon' }),
    episodeTitle: 'Der erste Kirschblütentag',
  },
}

export const Filler: Story = {
  args: {
    episode: buildEpisode({ filler_type: 'filler', filler_type_label: 'Filler' }),
    episodeTitle: 'Ein ruhiger Nachmittag',
  },
}

export const Gemischt: Story = {
  name: 'Gemischt',
  args: {
    episode: buildEpisode({ filler_type: 'mixed', filler_type_label: 'Gemischt' }),
    episodeTitle: 'Zwischen zwei Welten',
  },
}

export const Rueckblick: Story = {
  name: 'Rückblick',
  args: {
    episode: buildEpisode({ filler_type: 'recap', filler_type_label: 'Rückblick' }),
    episodeTitle: 'Was bisher geschah',
  },
}

export const OhneKlassifikation: Story = {
  name: 'Ohne Klassifikation',
  args: {
    episode: buildEpisode({ filler_type: 'unknown', filler_type_label: 'Unbekannt' }),
    episodeTitle: 'Noch nicht eingeordnete Episode',
  },
}

export const Aufgeklappt: Story = {
  name: 'Aufgeklappt',
  args: {
    episode: buildEpisode(),
    episodeTitle: 'Der erste Kirschblütentag',
    initiallyExpanded: true,
  },
}

export const Zugeklappt: Story = {
  name: 'Zugeklappt',
  args: {
    episode: buildEpisode(),
    episodeTitle: 'Der erste Kirschblütentag',
    initiallyExpanded: false,
  },
}

export const EineVersion: Story = {
  name: 'Eine Version',
  args: {
    episode: buildEpisode({ version_count: 1 }),
    episodeTitle: 'Der erste Kirschblütentag',
  },
}

export const MehrereVersionen: Story = {
  name: 'Mehrere Versionen',
  args: {
    episode: buildEpisode({ version_count: 4 }),
    episodeTitle: 'Der erste Kirschblütentag',
  },
}

export const LangerTitel: Story = {
  name: 'Langer Titel',
  parameters: {
    docs: {
      description: {
        story:
          'Responsiver Kopfzeilenfall: Reicht der eigene Platz des Titel-Slots nicht für Titelblock und ' +
          'Versionszähler nebeneinander (z. B. auf schmaler Bildschirmbreite), stapelt StackingRow beide ' +
          'stattdessen untereinander -- siehe Grundbausteine/StackingRow für die isolierte Demo.',
      },
    },
  },
  args: {
    episode: buildEpisode({ version_count: 2 }),
    episodeTitle:
      'Die unglaublich lange Episode über das Geheimnis unter den Kirschblüten der alten Schule',
  },
}

export const Liste: Story = {
  name: 'Liste (drei Folgen)',
  parameters: {
    docs: {
      description: {
        story:
          'Mehrere Episodenkarten untereinander, wie im echten Fansub-/Release-Browser ' +
          '(FansubVersionBrowser): gemeinsamer `Stack as="ul" gap="listRows"` statt eines hier ' +
          'nachgebauten Rasters, damit eine spätere Abstandsänderung an Stack automatisch mitkommt. Folge 2 ' +
          'ist Filler, damit die Farbtönung im Vergleich zu den Canon-Folgen sichtbar wird. Jede Karte hat ' +
          'ihren eigenen, unabhängigen Auf-/Zuklapp-Zustand (Folge 2 startet aufgeklappt).',
      },
    },
  },
  // render ersetzt die Einzelkarten-Demo vollständig durch die Mehrfach-Listen-Demo -- die
  // Pflicht-args episode/episodeTitle bleiben ungenutzte Platzhalter, nur um den Story-Typ zu erfüllen.
  args: {
    episode: buildEpisode(),
    episodeTitle: 'Der erste Kirschblütentag',
  },
  render: () => <EpisodeGlassCardListDemo />,
}
