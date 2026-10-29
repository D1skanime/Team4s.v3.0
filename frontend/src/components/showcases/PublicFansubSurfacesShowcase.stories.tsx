import type { Meta, StoryObj } from '@storybook/nextjs'

import { PublicFansubSurfacesShowcase } from './PublicFansubSurfacesShowcase'

/**
 * 1:1 aus der früheren In-App-Showcase-Route migrierte Komposition: rendert die
 * echten produktiven Public-Fansub-Komponenten (Header, Projekte, Geschichte, Historie,
 * Medien, Lightbox, Team) mit Mockdaten als UI-Wahrheit — Änderungen an diesen Komponenten
 * wirken dadurch sowohl hier als auch auf den echten Public-Seiten.
 */
const meta = {
  title: 'Im Einsatz/PublicFansubSurfacesShowcase',
  component: PublicFansubSurfacesShowcase,
  tags: ['autodocs'],
} satisfies Meta<typeof PublicFansubSurfacesShowcase>

export default meta
type Story = StoryObj<typeof meta>

export const Standard: Story = {}
