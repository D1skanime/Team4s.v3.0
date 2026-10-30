import type { Meta, StoryObj } from '@storybook/nextjs'
import { useState } from 'react'

import { Button } from './Button'
import { Modal } from './Modal'

const meta = {
  title: 'Zusammengesetzte Bausteine/Modal',
  component: Modal,
  tags: ['autodocs'],
  args: {
    open: true,
    onClose: () => {},
  },
  parameters: {
    docs: {
      description: {
        component:
          'Overlay-Primitive mit Fokus-Trap (Tab bleibt innerhalb des Panels) und Escape-Schließen. ' +
          'Storybook rendert statisch, daher `open: true` als Default-Arg — ein Modal, das erst per ' +
          'Klick geöffnet werden müsste, wäre in der Story unsichtbar. Besteht aus: DialogHeader ' +
          '(intern), IconButton, Button.',
      },
    },
  },
} satisfies Meta<typeof Modal>

export default meta
type Story = StoryObj<typeof meta>

export const Standard: Story = {
  args: {
    title: 'Release-Version archivieren?',
    description: 'Die Version bleibt nachvollziehbar, verschwindet aber aus der aktiven Arbeitsliste.',
    children: <p>Das Modal bleibt bewusst kurz und zeigt nur den nötigen Kontext vor einer klaren Entscheidung.</p>,
    footer: (
      <>
        <Button variant="secondary">Abbrechen</Button>
        <Button variant="danger">Archivieren</Button>
      </>
    ),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Der Fokus-Trap hält Tab-Navigation innerhalb des Panels; das addon-a11y-Panel dieser Story zeigt automatisierte Fokus-/Kontrast-Hinweise.',
      },
    },
  },
}

/**
 * Echte Öffnen-/Schließen-Interaktion statt des eingefrorenen `open: true`-Standard-Arg der
 * übrigen Stories: ein Klick auf den Auslöser-Button öffnet das Modal, Escape/Backdrop-Klick/
 * der Schließen-Button schließen es wieder über den eigenen `onClose`-Callback.
 */
export const OeffnenUndSchliessen: Story = {
  name: 'Öffnen und Schließen',
  args: {
    title: 'Release-Version archivieren?',
    description: 'Die Version bleibt nachvollziehbar, verschwindet aber aus der aktiven Arbeitsliste.',
    children: <p>Das Modal bleibt bewusst kurz und zeigt nur den nötigen Kontext vor einer klaren Entscheidung.</p>,
  },
  render: (args) => {
    function Demo() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <Button onClick={() => setOpen(true)}>Modal öffnen</Button>
          <Modal
            {...args}
            open={open}
            onClose={() => setOpen(false)}
            footer={(
              <>
                <Button variant="secondary" onClick={() => setOpen(false)}>Abbrechen</Button>
                <Button variant="danger" onClick={() => setOpen(false)}>Archivieren</Button>
              </>
            )}
          />
        </>
      )
    }
    return <Demo />
  },
}

export const LangerInhalt: Story = {
  name: 'Langer Inhalt',
  args: {
    title: 'Ausführliche Release-Notizen',
    size: 'lg',
    children: (
      <div>
        {Array.from({ length: 12 }, (_, index) => (
          <p key={index}>
            Absatz {index + 1}: Dieser Inhalt ist absichtlich lang, um das interne Scrollverhalten des Modal-Bodys bei
            überlangen Inhalten zu prüfen, ohne dass das Panel selbst über die Bildschirmhöhe hinauswächst.
          </p>
        ))}
      </div>
    ),
  },
}
