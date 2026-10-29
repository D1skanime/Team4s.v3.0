import type { Meta, StoryObj } from '@storybook/nextjs'

import { Button } from './Button'
import { Drawer } from './Drawer'

/** Seitlicher Drawer für fokussierte Detail-Ansichten. `open: true` als Default-Arg, da
 * Storybook statisch rendert. */
const meta = {
  title: 'UI/Drawer',
  component: Drawer,
  tags: ['autodocs'],
  args: {
    open: true,
    onClose: () => {},
    title: 'Release-Details',
    description: 'Der Drawer bleibt global, soll sich aber wie eine konzentrierte seitliche Arbeitsfläche anfühlen.',
    children: <p>Mock-Detailinhalt ohne API-Seam.</p>,
    footer: <Button variant="secondary">Schließen</Button>,
  },
} satisfies Meta<typeof Drawer>

export default meta
type Story = StoryObj<typeof meta>

export const NormalGross: Story = {
  name: 'NormalGross',
  args: { size: 'md' },
}

export const Gross: Story = {
  args: { size: 'lg' },
}
