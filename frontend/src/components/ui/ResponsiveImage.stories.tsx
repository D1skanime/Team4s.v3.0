import type { Meta, StoryObj } from '@storybook/nextjs'

import { ANIME_COVER_BILD } from '@/lib/storybookBildKatalog'

import { ResponsiveImage } from './ResponsiveImage'

/**
 * Dünner `next/image`-Wrapper, der VOR next/images eigener SSR-Prüfung erkennt, ob ein
 * `src` zu den in `publicImagePatterns` konfigurierten lokalen/externen Mustern passt --
 * nur dann läuft das Bild durch den Next.js-Optimierer, sonst rendert es unoptimiert
 * (unverändertes Original) statt die ganze Seite mit einem E426/E231-Fehler abstürzen zu
 * lassen. Beide Zweige zeigen exakt dasselbe `<Image>`-Element mit identischer Geometrie --
 * es gibt keinen separaten Fallback-Platzhalter.
 */
const meta = {
  title: 'Grundbausteine/ResponsiveImage',
  component: ResponsiveImage,
  tags: ['autodocs'],
  args: {
    alt: 'Beispielbild',
    width: 240,
    height: 320,
  },
} satisfies Meta<typeof ResponsiveImage>

export default meta
type Story = StoryObj<typeof meta>

export const Optimiert: Story = {
  name: 'Optimiert (konfiguriertes Muster)',
  args: {
    src: ANIME_COVER_BILD.pfad,
    alt: ANIME_COVER_BILD.altText,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Der Pfad liegt unter `/storybook-bilder/**` aus `LOCAL_IMAGE_PATTERNS` -- das Bild läuft durch den Next.js-Bildoptimierer (`unoptimized={false}`).',
      },
    },
  },
}

export const NichtKonfigurierterPfad: Story = {
  name: 'Unoptimiert (nicht konfigurierter Pfad)',
  args: {
    src: '/media/image_1788047813685_example.jpg',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Ein flacher Alt-Pfad außerhalb aller konfigurierten Muster. Statt eines E426-Absturzes rendert ResponsiveImage unoptimiert weiter -- die hier sichtbare Bruch-Darstellung ist das native Browser-Verhalten für ein nicht auflösbares Bild, kein eigenes Fallback-Visual der Komponente.',
      },
    },
  },
}

export const RundesVorschauBild: Story = {
  name: 'Rundes Vorschau-Miniaturbild',
  args: {
    src: ANIME_COVER_BILD.pfad,
    alt: ANIME_COVER_BILD.altText,
    width: 66,
    height: 92,
    roundedThumbnail: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Die roundedThumbnail-Prop rundet und beschneidet das Bild wie ein kleines, randloses Vorschau-/Miniaturbild (z. B. das Cover-Bild einer schwebenden Randnavigations-Vorschaukarte) -- ein Aufrufer schreibt dafür keine eigene border-radius-Regel mehr.',
      },
    },
  },
}
