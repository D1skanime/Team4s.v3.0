import type { Meta, StoryObj } from '@storybook/nextjs'
import { useState } from 'react'

import { Button } from '@/components/ui'

import { DrawerShowcase } from './DrawerShowcase'

/**
 * Komposition
 * (Release-Details-Drawer mit Größen-Umschalter und Tabs) — keine neuen
 * Zustands-Varianten gegenüber der ursprünglichen Seite erfunden.
 */
const meta = {
  title: 'Im Einsatz/Drawer mit Größen-Umschalter',
  component: DrawerShowcase,
  tags: ['autodocs'],
} satisfies Meta<typeof DrawerShowcase>

export default meta
type Story = StoryObj<typeof meta>

/** Echter `useState`-Zustand statt des eingefrorenen `open: true`/`onClose: () => {}`-
 *  Platzhalters -- Schließen-Button/Escape/Backdrop-Klick schließen den Drawer tatsächlich, ein
 *  Auslöser-Button öffnet ihn erneut. */
function ControlledDrawerShowcase() {
  const [open, setOpen] = useState(true)
  return (
    <>
      {!open ? <Button onClick={() => setOpen(true)}>Drawer erneut öffnen</Button> : null}
      <DrawerShowcase open={open} onClose={() => setOpen(false)} />
    </>
  )
}

export const Standard: Story = {
  // render() ignoriert args und baut seinen eigenen Öffnen-/Schließen-Zustand -- Platzhalter-args
  // nur, weil Storybooks Typen ein vollständiges args-Objekt verlangen.
  args: { open: true, onClose: () => {} },
  render: () => <ControlledDrawerShowcase />,
}
