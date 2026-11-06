import type { Meta, StoryObj } from '@storybook/nextjs'

import { Text } from '@/components/ui'
import { ANIME_BANNER_BILDER } from '@/lib/storybookBildKatalog'

import { BildKatalogDocsPage } from './BildKatalogShowcase.docsPage'
import styles from './BildKatalogShowcase.module.css'

/**
 * Zeigt alle Anime-Banner-Beispielbilder aus dem zentralen Bildkatalog untereinander, roh wie
 * die übrigen "Bilder/*"-Stories -- jeweils mit der Typbezeichnung und dem Namen des Anime
 * darunter, damit sichtbar wird, wie unterschiedlich echte Banner in Seitenverhältnis und
 * Bildausschnitt ausfallen.
 */
function AnimeBannerGalerie() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {ANIME_BANNER_BILDER.map((eintrag) => (
        <figure key={eintrag.id} className={styles.figureVollbreite}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={eintrag.pfad} alt={eintrag.altText} className={styles.imageVollbreite} />
          <figcaption>
            <Text variant="strong">{eintrag.bezeichnung}</Text>
            {eintrag.animeName ? <Text variant="meta">{eintrag.animeName}</Text> : null}
          </figcaption>
        </figure>
      ))}
    </div>
  )
}

const meta = {
  title: 'Bilder/Anime-Banner',
  component: AnimeBannerGalerie,
  tags: ['autodocs'],
  parameters: {
    docs: {
      page: BildKatalogDocsPage,
      canvas: { sourceState: 'none' },
    },
  },
} satisfies Meta<typeof AnimeBannerGalerie>

export default meta
type Story = StoryObj<typeof meta>

export const Standard: Story = {}
