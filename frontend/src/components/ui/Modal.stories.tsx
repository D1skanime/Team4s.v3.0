import type { Meta, StoryObj } from '@storybook/nextjs'
import { useState } from 'react'
import type { ComponentProps, ReactNode } from 'react'

import { storybookDocsLink } from '@/lib/storybookLinks'

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
          `Besteht aus: ${storybookDocsLink('Grundbausteine/IconButton', 'IconButton')}, ${storybookDocsLink('Grundbausteine/Button', 'Button')} (DialogHeader liefert die Kopfzeile, aber als internes Implementierungsdetail ohne eigene Story).`,
      },
    },
  },
} satisfies Meta<typeof Modal>

export default meta
type Story = StoryObj<typeof meta>

type ControlledModalProps = Omit<ComponentProps<typeof Modal>, 'open' | 'onClose' | 'footer'> & {
  /** Render-Funktion statt eines fertigen `ReactNode` wie bei Modals eigenem `footer`-Prop --
   *  die Footer-Buttons brauchen Zugriff auf das lokale `close`, das erst innerhalb dieser
   *  Komponente entsteht. */
  footer?: (close: () => void) => ReactNode
}

/** Echter `useState`-Zustand statt eines eingefrorenen `open: true`/`onClose: () => {}`-
 *  Platzhalters -- das Modal startet geöffnet (sofort sichtbar), Escape/Backdrop-Klick/die
 *  Footer-Aktionen schließen es tatsächlich; ein "Modal erneut öffnen"-Button erscheint danach,
 *  damit die Story kein Sackgassen-Zustand wird. */
function ControlledModal({ footer, ...props }: ControlledModalProps) {
  const [open, setOpen] = useState(true)
  const close = () => setOpen(false)
  return (
    <>
      {!open ? <Button onClick={() => setOpen(true)}>Modal erneut öffnen</Button> : null}
      <Modal {...props} open={open} onClose={close} footer={footer ? footer(close) : undefined} />
    </>
  )
}

export const Standard: Story = {
  // render() ignoriert args und baut seinen eigenen Öffnen-/Schließen-Zustand -- Platzhalter-args
  // nur, weil Storybooks Typen bei Pflicht-Props (title/children) ein vollständiges args-Objekt
  // verlangen, identisches Muster wie Pagination.stories.tsx' NachladeModus-Story.
  args: { title: 'Release-Version archivieren?', children: null },
  render: () => (
    <ControlledModal
      title="Release-Version archivieren?"
      description="Die Version bleibt nachvollziehbar, verschwindet aber aus der aktiven Arbeitsliste."
      footer={(close) => (
        <>
          <Button variant="secondary" onClick={close}>Abbrechen</Button>
          <Button variant="danger" onClick={close}>Archivieren</Button>
        </>
      )}
    >
      <p>Das Modal bleibt bewusst kurz und zeigt nur den nötigen Kontext vor einer klaren Entscheidung.</p>
    </ControlledModal>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Der Fokus-Trap hält Tab-Navigation innerhalb des Panels; das addon-a11y-Panel dieser Story zeigt automatisierte Fokus-/Kontrast-Hinweise. Escape, Backdrop-Klick und die Footer-Aktionen schließen das Modal tatsächlich.',
      },
    },
  },
}

/**
 * Identisch zu Standard, zusätzlich mit den vollständigen `args` aus `meta` (inklusive des
 * eingefrorenen `open: true`-Platzhalters) als Storybook-Controls bedienbar -- demonstriert,
 * dass ein Aufrufer beliebige Props über `args` überschreiben kann, ohne die lokale
 * Öffnen-/Schließen-Logik zu verlieren.
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
  // Platzhalter-args aus demselben Grund wie bei Standard oben.
  args: { title: 'Ausführliche Release-Notizen', children: null },
  render: () => (
    <ControlledModal title="Ausführliche Release-Notizen" size="lg">
      <div>
        {Array.from({ length: 12 }, (_, index) => (
          <p key={index}>
            Absatz {index + 1}: Dieser Inhalt ist absichtlich lang, um das interne Scrollverhalten des Modal-Bodys bei
            überlangen Inhalten zu prüfen, ohne dass das Panel selbst über die Bildschirmhöhe hinauswächst.
          </p>
        ))}
      </div>
    </ControlledModal>
  ),
}
