import type { Meta, StoryObj } from '@storybook/nextjs'
import { useState } from 'react'

import { Button } from './Button'
import { Drawer } from './Drawer'

const meta = {
  title: 'Zusammengesetzte Bausteine/Drawer',
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
  parameters: {
    docs: {
      description: {
        component:
          'Seitlicher Drawer für fokussierte Detail-Ansichten. `open: true` als Default-Arg, da ' +
          'Storybook statisch rendert. Besteht aus: DialogHeader (intern), IconButton, Button.',
      },
    },
  },
} satisfies Meta<typeof Drawer>

export default meta
type Story = StoryObj<typeof meta>

export const NormalGross: Story = {
  name: 'Normal, groß',
  args: { size: 'md' },
}

export const Gross: Story = {
  name: 'Groß',
  args: { size: 'lg' },
}

/**
 * Echte Öffnen-/Schließen-Interaktion statt des eingefrorenen `open: true`-Standard-Arg der
 * übrigen Stories: ein Klick auf den Auslöser-Button öffnet den Drawer, Escape/Backdrop-Klick/
 * der Schließen-Button schließen ihn wieder über den eigenen `onClose`-Callback.
 */
export const OeffnenUndSchliessen: Story = {
  name: 'Öffnen und Schließen',
  render: (args) => {
    function Demo() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <Button onClick={() => setOpen(true)}>Drawer öffnen</Button>
          <Drawer {...args} open={open} onClose={() => setOpen(false)} />
        </>
      )
    }
    return <Demo />
  },
}
