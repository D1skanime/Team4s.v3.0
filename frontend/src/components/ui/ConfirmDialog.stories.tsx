import type { Meta, StoryObj } from '@storybook/nextjs'
import { useState } from 'react'

import { storybookDocsLink } from '@/lib/storybookLinks'

import { Button } from './Button'
import { useConfirmDialog } from './ConfirmDialog'
import { Text } from './Text'

const meta = {
  title: 'Zusammengesetzte Bausteine/ConfirmDialog',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Fragt vor einer riskanten oder nicht rückgängig machbaren Aktion (z. B. Löschen, ' +
          'Verwerfen ungespeicherter Änderungen) noch einmal explizit nach, bevor sie ausgeführt ' +
          `wird. Besteht aus: ${storybookDocsLink('Zusammengesetzte Bausteine/Modal', 'Modal')}, ${storybookDocsLink('Grundbausteine/Button', 'Button')}.`,
      },
    },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

function StandardDemo() {
  const { confirm, confirmDialog } = useConfirmDialog()
  const [ergebnis, setErgebnis] = useState<'offen' | 'bestätigt' | 'abgebrochen'>('offen')
  return (
    <>
      <Button
        onClick={async () => {
          const bestaetigt = await confirm({ title: 'Änderungen verwerfen?', description: 'Ungespeicherte Änderungen gehen verloren.' })
          setErgebnis(bestaetigt ? 'bestätigt' : 'abgebrochen')
        }}
      >
        Bestätigungsdialog öffnen
      </Button>
      <Text variant="soft">Ergebnis: {ergebnis}</Text>
      {confirmDialog}
    </>
  )
}

export const Standard: Story = {
  render: () => <StandardDemo />,
}

function DangerDemo() {
  const { confirm, confirmDialog } = useConfirmDialog()
  const [ergebnis, setErgebnis] = useState<'offen' | 'bestätigt' | 'abgebrochen'>('offen')
  return (
    <>
      <Button
        variant="danger"
        onClick={async () => {
          const bestaetigt = await confirm({
            title: 'Release-Version wirklich löschen?',
            description: 'Dieser Schritt kann nicht rückgängig gemacht werden.',
            confirmLabel: 'Löschen',
            tone: 'danger',
          })
          setErgebnis(bestaetigt ? 'bestätigt' : 'abgebrochen')
        }}
      >
        Löschen-Bestätigung öffnen
      </Button>
      <Text variant="soft">Ergebnis: {ergebnis}</Text>
      {confirmDialog}
    </>
  )
}

export const DangerVariante: Story = {
  name: 'Gefahr-Variante',
  render: () => <DangerDemo />,
}
