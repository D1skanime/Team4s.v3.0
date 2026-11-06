import type { Meta, StoryObj } from '@storybook/nextjs'

import { PublicReleaseSurfacesShowcase } from './PublicReleaseSurfacesShowcase'

/**
 * Komposition: rendert die
 * echten produktiven Public-Release-Komponenten (Release-Block, Lightbox, Desktop-Zeile) mit
 * Mockdaten als UI-Wahrheit.
 */
const meta = {
  title: 'Zusammengesetzte Bausteine/Öffentliche Release-Oberflächen',
  component: PublicReleaseSurfacesShowcase,
  tags: ['autodocs'],
} satisfies Meta<typeof PublicReleaseSurfacesShowcase>

export default meta
type Story = StoryObj<typeof meta>

export const Standard: Story = {}
