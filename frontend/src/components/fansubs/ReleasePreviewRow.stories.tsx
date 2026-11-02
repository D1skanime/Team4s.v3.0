import type { Meta, StoryObj } from '@storybook/nextjs'

import { BannerSection } from '@/components/ui/BannerSection'
import { storybookDocsLink } from '@/lib/storybookLinks'
import type { PublicEpisodeVersion } from '@/types/episodeVersion'

import { ReleasePreviewRow } from './ReleasePreviewRow'

function buildVersion(overrides: Partial<PublicEpisodeVersion> = {}): PublicEpisodeVersion {
  return {
    id: 1,
    variant_id: 1,
    release_version_id: 1,
    anime_id: 1,
    episode_number: 1,
    title: null,
    release_version: 'v1',
    video_quality: '1080p',
    subtitle_type: 'softsub',
    release_date: '2024-01-07',
    fansub_groups: [{ id: 1, slug: 'demo-fansub-gruppe', name: 'Demo Fansub-Gruppe' }],
    container: 'mkv',
    video_codec: 'h264',
    has_images: false,
    has_notes: false,
    has_karaoke: false,
    release_name: 'Demo Fansub-Gruppe v1',
    ...overrides,
  }
}

/** Release-/Versionszeile für den öffentlichen Fansub-Browser -- besteht aus Card (Glas-Fläche,
 *  variant="glassStrong"), Avatar (Gruppenlogo mit Initialen-Kürzel-Fallback), Text (Gruppenname/
 *  Release-/Technik-/Extras-/Datumszeile) sowie dem bereits globalen Button für den "Zum
 *  Release"-Link. */
const meta = {
  title: 'Zusammengesetzte Bausteine/Release-Versionszeile',
  component: ReleasePreviewRow,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          `Besteht aus: ${storybookDocsLink('Grundbausteine/Card', 'Card')} (variant="glassStrong"), ` +
          `${storybookDocsLink('Grundbausteine/Avatar', 'Avatar')} (Logo + Kürzel-Fallback), ` +
          `${storybookDocsLink('Grundbausteine/Text', 'Text')} (Gruppenname/Release-/Technik-/Extras-/` +
          `Datumszeile), ${storybookDocsLink('Zusammengesetzte Bausteine/Button', 'Button')} (Release-Link).`,
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ position: 'relative', minHeight: 160, padding: 20 }}>
        <BannerSection imageUrl="/covers/placeholder.jpg" imageAlt="Bannerhintergrund" withTextScrim />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <Story />
        </div>
      </div>
    ),
  ],
  args: {
    animeID: 1,
    version: buildVersion(),
  },
} satisfies Meta<typeof ReleasePreviewRow>

export default meta
type Story = StoryObj<typeof meta>

export const MitGruppenlogo: Story = {
  name: 'Mit Gruppenlogo',
  args: {
    version: buildVersion({
      fansub_groups: [{ id: 1, slug: 'demo-fansub-gruppe', name: 'Demo Fansub-Gruppe', logo_url: '/covers/placeholder.jpg' }],
    }),
  },
}

export const OhneLogo: Story = {
  name: 'Ohne Logo',
  args: {
    version: buildVersion({
      fansub_groups: [{ id: 1, slug: 'demo-fansub-gruppe', name: 'Demo Fansub-Gruppe' }],
    }),
  },
}

export const Koop: Story = {
  name: 'Koop',
  args: {
    version: buildVersion({
      fansub_groups: [
        { id: 1, slug: 'demo-fansub-gruppe', name: 'Demo Fansub-Gruppe' },
        { id: 2, slug: 'zweite-gruppe', name: 'Zweite Gruppe' },
      ],
    }),
  },
}

export const MitAllenExtras: Story = {
  name: 'Mit allen Extras',
  args: {
    version: buildVersion({ has_images: true, has_notes: true, has_karaoke: true }),
  },
}

export const OhneTechnikUndDatum: Story = {
  name: 'Ohne Technik und Datum',
  args: {
    version: buildVersion({
      video_quality: null,
      container: null,
      video_codec: null,
      subtitle_type: null,
      release_date: null,
    }),
  },
}
