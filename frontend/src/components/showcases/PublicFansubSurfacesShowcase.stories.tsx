import type { Meta, StoryObj } from '@storybook/nextjs'

import { PublicFansubSurfacesShowcase } from './PublicFansubSurfacesShowcase'

/**
 * Komposition: rendert die
 * echten produktiven Public-Fansub-Komponenten (Header, Projekte, Geschichte, Historie,
 * Medien, Lightbox, Team) mit Mockdaten als UI-Wahrheit — Änderungen an diesen Komponenten
 * wirken dadurch sowohl hier als auch auf den echten Public-Seiten.
 */
const meta = {
  title: 'Im Einsatz/Öffentliche Fansub-Oberflächen',
  component: PublicFansubSurfacesShowcase,
  tags: ['autodocs'],
} satisfies Meta<typeof PublicFansubSurfacesShowcase>

export default meta
type Story = StoryObj<typeof meta>

export const Standard: Story = {}
