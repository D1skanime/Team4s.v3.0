import type { Meta, StoryObj } from '@storybook/nextjs'
import { useState } from 'react'

import { storybookDocsLink } from '@/lib/storybookLinks'

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
          'Seitlicher Drawer für fokussierte Detail-Ansichten. Besteht aus: ' +
          `${storybookDocsLink('Grundbausteine/IconButton', 'IconButton')}, ${storybookDocsLink('Grundbausteine/Button', 'Button')} (DialogHeader liefert die Kopfzeile, aber als internes Implementierungsdetail ohne eigene Story).`,
      },
    },
  },
} satisfies Meta<typeof Drawer>

export default meta
type Story = StoryObj<typeof meta>

/** Echter `useState`-Zustand statt eines eingefrorenen `open: true`/`onClose: () => {}`-
 *  Platzhalters -- ein Klick auf den Auslöser-Button öffnet den Drawer in der jeweiligen Größe,
 *  Escape/Backdrop-Klick/der Schließen-Button im Footer schließen ihn wieder über den echten
 *  `onClose`-Callback. */
function ControlledDrawer({ size }: { size: 'md' | 'lg' }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>Drawer öffnen</Button>
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        size={size}
        title="Release-Details"
        description="Der Drawer bleibt global, soll sich aber wie eine konzentrierte seitliche Arbeitsfläche anfühlen."
        footer={<Button variant="secondary" onClick={() => setOpen(false)}>Schließen</Button>}
      >
        <p>Mock-Detailinhalt ohne API-Seam.</p>
      </Drawer>
    </>
  )
}

export const NormalGross: Story = {
  name: 'Normal, groß',
  render: () => <ControlledDrawer size="md" />,
}

export const Gross: Story = {
  name: 'Groß',
  render: () => <ControlledDrawer size="lg" />,
}

/**
 * Identisch zu NormalGross/Gross, zusätzlich mit den vollständigen `args` aus `meta` (inklusive
 * des eingefrorenen `open: true`-Platzhalters) als Storybook-Controls bedienbar -- demonstriert,
 * dass ein Aufrufer beliebige Props über `args` überschreiben kann, ohne die lokale
 * Öffnen-/Schließen-Logik zu verlieren.
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
