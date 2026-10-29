import type { Meta, StoryObj } from '@storybook/nextjs'

import { Button } from './Button'
import { useConfirmDialog } from './ConfirmDialog'

const meta = {
  title: 'Zusammengesetzte Bausteine/ConfirmDialog',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '`useConfirmDialog()` ist ein Hook+Komponenten-Verbund (kein reines Props-Rendering) — ' +
          'diese Story demonstriert den echten Aufruf-Fluss: Button klicken öffnet das Modal, ' +
          'Bestätigen/Abbrechen löst das zurückgegebene Promise auf. Besteht aus: Modal, Button.',
      },
    },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

function StandardDemo() {
  const { confirm, confirmDialog } = useConfirmDialog()
  return (
    <>
      <Button
        onClick={async () => {
          await confirm({ title: 'Änderungen verwerfen?', description: 'Ungespeicherte Änderungen gehen verloren.' })
        }}
      >
        Bestätigungsdialog öffnen
      </Button>
      {confirmDialog}
    </>
  )
}

export const Standard: Story = {
  render: () => <StandardDemo />,
}

function DangerDemo() {
  const { confirm, confirmDialog } = useConfirmDialog()
  return (
    <>
      <Button
        variant="danger"
        onClick={async () => {
          await confirm({
            title: 'Release-Version wirklich löschen?',
            description: 'Dieser Schritt kann nicht rückgängig gemacht werden.',
            confirmLabel: 'Löschen',
            tone: 'danger',
          })
        }}
      >
        Löschen-Bestätigung öffnen
      </Button>
      {confirmDialog}
    </>
  )
}

export const DangerVariante: Story = {
  name: 'Gefahr-Variante',
  render: () => <DangerDemo />,
}
